import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ExecutionCompleted } from './../src/modules/mechanic/domain/events/execution-completed.event';
import { ExecutionStarted } from './../src/modules/mechanic/domain/events/execution-started.event';
import type { DomainEvent } from './../src/shared/domain/events/domain-event';
import {
  CLEANUP_TABLES,
  givenConsultant,
  givenOwnedVehicle,
  httpAs,
  tokenFor,
} from './fixtures';
import { UserRole } from '../src/modules/auth/public/roles';

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let pool: Pool;
  let vehicleId: string;
  let openedById: string;
  let emitter: EventEmitter2;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = tokenFor(app, UserRole.ADMIN);

    emitter = app.get(EventEmitter2);

    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tech_challenge',
    });
  });

  beforeEach(async () => {
    for (const table of CLEANUP_TABLES) {
      await pool.query(`DELETE FROM ${table}`);
    }

    vehicleId = (await givenOwnedVehicle(app.getHttpServer(), token)).vehicleId;
    openedById = await givenConsultant(app.getHttpServer(), token);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface PaymentResponse {
    id: string;
    serviceOrderId: string;
    amountInCents: number;
    paidAt: string;
    createdAt: string;
    updatedAt: string;
  }

  interface QuotationResponse {
    id: string;
    totalInCents: number;
  }

  // Execution still belongs to the mechanic module, which does not exist
  // yet, so those two transitions are driven directly through the events it
  // will eventually publish — the same approach service-orders.e2e-spec.ts
  // uses for the same gap.
  async function emit(event: DomainEvent): Promise<void> {
    await emitter.emitAsync(event.name, event);
  }

  async function givenService(laborPriceInCents = 15000): Promise<string> {
    const res = await http()
      .post('/services')
      .send({
        name: `Servico ${Math.random().toString(36).slice(2, 10)}`,
        category: 'mechanical',
        laborPriceInCents,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  // Stops right after the customer approves the quotation: the order exists,
  // is fully quoted, but has not reached `finished` yet.
  async function givenApprovedOrder(
    laborPriceInCents = 15000,
  ): Promise<{ orderId: string; totalInCents: number }> {
    const created = await http()
      .post('/service-order/anamnesis')
      .send({
        vehicleId,
        consultantId: openedById,
        mainComplaint: 'Barulho na suspensão',
        problemDescription: 'Estalo ao passar em lombadas',
      })
      .expect(201);
    const orderId = (created.body as { serviceOrderId: string }).serviceOrderId;

    await http().post(`/service-orders/${orderId}/diagnosis/start`).expect(200);
    const serviceId = await givenService(laborPriceInCents);
    const diagnosed = await http()
      .post(`/service-orders/${orderId}/diagnosis`)
      .send({
        findings: 'Pastilhas de freio gastas',
        serviceItems: [{ serviceId, quantity: 1 }],
      })
      .expect(201);
    const quotation = (diagnosed.body as { quotation: QuotationResponse })
      .quotation;

    await http().post(`/quotations/${quotation.id}/approve`).expect(200);

    return { orderId, totalInCents: quotation.totalInCents };
  }

  async function givenFinishedOrder(
    laborPriceInCents = 15000,
  ): Promise<{ orderId: string; totalInCents: number }> {
    const { orderId, totalInCents } =
      await givenApprovedOrder(laborPriceInCents);

    await emit(new ExecutionStarted(orderId));
    await emit(new ExecutionCompleted(orderId));

    return { orderId, totalInCents };
  }

  async function orderStatus(orderId: string): Promise<string> {
    const res = await http()
      .get(`/service-orders/${orderId}/status`)
      .expect(200);
    return (res.body as { status: string }).status;
  }

  // `publish()` is fire-and-forget in production (see settle-payment.usecase.ts):
  // POST /payments returns before PaymentReceivedHandler on the
  // service-orders side has necessarily run. A client checking the order's
  // status right after paying faces the same gap, so the assertion polls
  // instead of reading once.
  async function pollUntilDelivered(orderId: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const status = await orderStatus(orderId);
      if (status === 'delivered') return status;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return orderStatus(orderId);
  }

  describe('POST /payments', () => {
    it('settles the quoted total for a finished order', async () => {
      const { orderId, totalInCents } = await givenFinishedOrder(20000);

      const res = await http()
        .post('/payments')
        .send({ serviceOrderId: orderId })
        .expect(201);

      const payment = res.body as PaymentResponse;
      expect(payment.serviceOrderId).toBe(orderId);
      expect(payment.amountInCents).toBe(totalInCents);
      expect(payment.paidAt).not.toBeNull();
    });

    it('moves the order from finished to delivered', async () => {
      const { orderId } = await givenFinishedOrder();

      await http()
        .post('/payments')
        .send({ serviceOrderId: orderId })
        .expect(201);

      await expect(pollUntilDelivered(orderId)).resolves.toBe('delivered');
    });

    it('returns 404 for a service order that does not exist', async () => {
      await http()
        .post('/payments')
        .send({ serviceOrderId: '6f2c8e0a-0b0e-4f6e-9e1e-000000000000' })
        .expect(404);
    });

    it('returns 404 for an order that has not been quoted yet', async () => {
      const created = await http()
        .post('/service-order/anamnesis')
        .send({
          vehicleId,
          consultantId: openedById,
          mainComplaint: 'Barulho na suspensão',
          problemDescription: 'Estalo ao passar em lombadas',
        })
        .expect(201);

      await http()
        .post('/payments')
        .send({
          serviceOrderId: (created.body as { serviceOrderId: string })
            .serviceOrderId,
        })
        .expect(404);
    });

    it('rejects an order that is quoted and approved but not finished yet', async () => {
      const { orderId } = await givenApprovedOrder();

      await http()
        .post('/payments')
        .send({ serviceOrderId: orderId })
        .expect(409);
    });

    it('rejects a second payment for the same order', async () => {
      const { orderId } = await givenFinishedOrder();

      await http()
        .post('/payments')
        .send({ serviceOrderId: orderId })
        .expect(201);
      await http()
        .post('/payments')
        .send({ serviceOrderId: orderId })
        .expect(409);
    });
  });

  describe('GET /payments/:id', () => {
    it('returns the payment by id', async () => {
      const { orderId } = await givenFinishedOrder();
      const created = await http()
        .post('/payments')
        .send({ serviceOrderId: orderId })
        .expect(201);
      const paymentId = (created.body as PaymentResponse).id;

      const res = await http().get(`/payments/${paymentId}`).expect(200);
      expect((res.body as PaymentResponse).id).toBe(paymentId);
    });

    it('returns 404 for an unknown payment', async () => {
      await http()
        .get('/payments/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
    });
  });
});
