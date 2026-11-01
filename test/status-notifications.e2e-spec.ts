import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ExecutionCompleted } from './../src/modules/mechanic/domain/events/execution-completed.event';
import { ExecutionStarted } from './../src/modules/mechanic/domain/events/execution-started.event';
import { RecordingEmailSender } from './../src/modules/service-management/notifications/__test__/recording-email.sender';
import { EMAIL_SENDER } from './../src/modules/service-management/notifications/domain/email-sender.port';
import type { EmailSender } from './../src/modules/service-management/notifications/domain/email-sender.port';
import { FileEmailSender } from './../src/modules/service-management/notifications/infrastructure/file-email-sender';
import type { DomainEvent } from './../src/shared/domain/events/domain-event';
import {
  CLEANUP_TABLES,
  givenConsultant,
  givenOwnedVehicle,
  httpAs,
  tokenFor,
} from './fixtures';
import { UserRole } from '../src/modules/auth/public/roles';

const ALL_STATUSES = [
  'received',
  'in_diagnosis',
  'awaiting_approval',
  'awaiting_execution',
  'in_execution',
  'finished',
  'delivered',
];

/**
 * One order walked from `received` to `delivered`, checking the customer hears
 * about every step. Six of the seven emails come from the status listener and
 * the seventh is the quotation email, which stands in for `awaiting_approval`.
 *
 * Execution still has no HTTP entry point here, so those two transitions are
 * driven through the mechanic's events, as payments.e2e-spec.ts does.
 */
describe('Status change notifications (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let pool: Pool;
  let emitter: EventEmitter2;
  let vehicleId: string;
  let openedById: string;
  let customerEmail: string;

  beforeAll(() => {
    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tech_challenge',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function boot(sender: EmailSender): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SENDER)
      .useValue(sender)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = tokenFor(app, UserRole.ADMIN);
    emitter = app.get(EventEmitter2);

    for (const table of CLEANUP_TABLES) {
      await pool.query(`DELETE FROM ${table}`);
    }

    const owned = await givenOwnedVehicle(app.getHttpServer(), token);
    vehicleId = owned.vehicleId;
    customerEmail = owned.email;
    openedById = await givenConsultant(app.getHttpServer(), token);
  }

  const http = () => httpAs(app, token);
  const unique = () => Math.random().toString(36).slice(2, 10);

  // Status emails are sent from a listener the publisher does not await, so
  // the call that caused one has already answered by the time it goes out.
  async function eventually(
    assertion: () => Promise<void> | void,
    timeoutMs = 3000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        await assertion();
        return;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
  }

  async function emit(event: DomainEvent): Promise<void> {
    await emitter.emitAsync(event.name, event);
  }

  async function orderStatus(orderId: string): Promise<string> {
    const res = await http()
      .get(`/service-orders/${orderId}/status`)
      .expect(200);
    return (res.body as { status: string }).status;
  }

  async function openOrder(): Promise<string> {
    const res = await http()
      .post('/service-order/anamnesis')
      .send({
        vehicleId,
        consultantId: openedById,
        mainComplaint: 'Barulho na suspensão',
        problemDescription: 'Estalo ao passar em lombadas',
      })
      .expect(201);
    return (res.body as { serviceOrderId: string }).serviceOrderId;
  }

  /** received → delivered, through the same routes and events production uses. */
  async function walkToDelivered(orderId: string): Promise<void> {
    await http().post(`/service-orders/${orderId}/diagnosis/start`).expect(200);

    const service = await http()
      .post('/services')
      .send({
        name: `Servico ${unique()}`,
        category: 'mechanical',
        laborPriceInCents: 15000,
      })
      .expect(201);
    const diagnosis = await http()
      .post(`/service-orders/${orderId}/diagnosis`)
      .send({
        findings: 'Pastilhas de freio gastas',
        serviceItems: [
          { serviceId: (service.body as { id: string }).id, quantity: 1 },
        ],
      })
      .expect(201);
    const quotationId = (diagnosis.body as { quotation: { id: string } })
      .quotation.id;

    await http().post(`/quotations/${quotationId}/approve`).expect(200);
    await emit(new ExecutionStarted(orderId));
    await emit(new ExecutionCompleted(orderId));
    await http()
      .post('/payments')
      .send({ serviceOrderId: orderId })
      .expect(201);

    await eventually(async () =>
      expect(await orderStatus(orderId)).toBe('delivered'),
    );
  }

  describe('with a recording sender', () => {
    let emails: RecordingEmailSender;

    beforeEach(async () => {
      emails = new RecordingEmailSender();
      await boot(emails);
    });

    afterEach(async () => {
      await app.close();
    });

    it('emails the customer once per status, from received to delivered', async () => {
      const orderId = await openOrder();
      await walkToDelivered(orderId);

      await eventually(() => expect(emails.messages).toHaveLength(7));

      for (const status of ALL_STATUSES) {
        const sent = emails.messagesFor(status);
        expect(sent).toHaveLength(1);
        expect(sent[0].to).toBe(customerEmail);
        expect(sent[0].tag).toBe(`${orderId}--${status}`);
      }
      expect(emails.messagesFor('in_diagnosis')[0].html).toContain(
        'Em diagnóstico',
      );
      expect(emails.messagesFor('delivered')[0].subject).toMatch(/^Entregue:/);
    });

    it('keeps the transition when the provider is down', async () => {
      emails.failure = new Error('provider outage');

      const orderId = await openOrder();
      await http()
        .post(`/service-orders/${orderId}/diagnosis/start`)
        .expect(200);

      expect(await orderStatus(orderId)).toBe('in_diagnosis');
      expect(emails.messages).toEqual([]);
    });
  });

  describe('with MAIL_DRIVER=file', () => {
    let directory: string;

    beforeEach(async () => {
      directory = await mkdtemp(join(tmpdir(), 'status-mail-'));
      await boot(
        new FileEmailSender({
          directory,
          from: 'oficina@example.com',
          fromName: 'Oficina',
        }),
      );
    });

    afterEach(async () => {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    });

    it('writes one browsable page per status change', async () => {
      const orderId = await openOrder();
      await walkToDelivered(orderId);

      await eventually(async () =>
        expect(await readdir(directory)).toHaveLength(7),
      );

      const files = (await readdir(directory)).sort();
      expect(files.map((name) => name.split('--')[2])).toEqual(
        expect.arrayContaining(ALL_STATUSES.map((s) => `${s}.html`)),
      );
      for (const name of files) {
        expect(name).toContain(`--${orderId}--`);
      }

      const page = await readFile(
        join(
          directory,
          files.find((n) => n.endsWith('--received.html'))!,
        ),
        'utf8',
      );
      expect(page).toContain('Oficina &lt;oficina@example.com&gt;');
      expect(page).toContain(customerEmail);
      expect(page).toContain('<title>Recebida: Fiat Uno');
      expect(page).toContain('srcdoc=');
    });
  });
});
