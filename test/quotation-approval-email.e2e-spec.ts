import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { EMAIL_SENDER } from './../src/modules/service-management/quotations/domain/email-sender.port';
import { RecordingEmailSender } from './../src/modules/service-management/quotations/__test__/recording-email.sender';
import { CLEANUP_TABLES, givenOwnedVehicle } from './fixtures';

/**
 * The whole approval path over HTTP: a diagnosis emails the quotation, and the
 * link in that email approves it.
 *
 * EMAIL_SENDER is replaced by a recorder — the suite must never reach Brevo,
 * and the raw token only exists inside the message, since the database keeps
 * nothing but its hash. Extracting it from the captured HTML is the only way
 * to get at it, which is exactly the guarantee being asserted.
 */
describe('Quotation approval by email (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let emails: RecordingEmailSender;
  let vehicleId: string;
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

  beforeEach(async () => {
    emails = new RecordingEmailSender();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SENDER)
      .useValue(emails)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    for (const table of CLEANUP_TABLES) {
      await pool.query(`DELETE FROM ${table}`);
    }

    const owned = await givenOwnedVehicle(app.getHttpServer());
    vehicleId = owned.vehicleId;
    customerEmail = owned.email;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await pool.end();
  });

  const http = () => request(app.getHttpServer());
  const unique = () => Math.random().toString(36).slice(2, 10);

  async function givenQuotedOrder(): Promise<{
    orderId: string;
    quotationId: string;
    totalInCents: number;
    approvalEmailSentAt: string | null;
  }> {
    const supply = await http()
      .post('/supplies')
      .send({ name: `Peca ${unique()}`, priceInCents: 4500 })
      .expect(201);
    const supplyId = (supply.body as { id: string }).id;

    const service = await http()
      .post('/services')
      .send({
        name: `Servico ${unique()}`,
        category: 'mechanical',
        laborPriceInCents: 9990,
      })
      .expect(201);
    const serviceId = (service.body as { id: string }).id;
    await http()
      .put(`/services/${serviceId}/supplies`)
      .send({ supplies: [{ supplyId, quantity: 4 }] })
      .expect(200);

    const order = await http()
      .post('/service-orders')
      .send({ vehicleId })
      .expect(201);
    const orderId = (order.body as { id: string }).id;
    await http().post(`/service-orders/${orderId}/diagnosis/start`).expect(200);

    const diagnosis = await http()
      .post(`/service-orders/${orderId}/diagnosis`)
      .send({
        findings: 'Pastilhas de freio gastas',
        serviceItems: [{ serviceId, quantity: 1 }],
      })
      .expect(201);

    const quotation = (
      diagnosis.body as {
        quotation: {
          id: string;
          totalInCents: number;
          approvalEmailSentAt: string | null;
        };
      }
    ).quotation;
    return {
      orderId,
      quotationId: quotation.id,
      totalInCents: quotation.totalInCents,
      approvalEmailSentAt: quotation.approvalEmailSentAt,
    };
  }

  const approvalUrl = () =>
    `/quotations/approve?token=${encodeURIComponent(emails.tokenFromLastLink()!)}`;

  describe('completing a diagnosis', () => {
    it('emails the quotation to the owner of the vehicle', async () => {
      const { totalInCents } = await givenQuotedOrder();

      expect(emails.messages).toHaveLength(1);
      expect(emails.lastMessage!.to).toBe(customerEmail);
      expect(emails.lastMessage!.html).toContain(
        (totalInCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
      );
    });

    it('records that the email went out', async () => {
      const { quotationId } = await givenQuotedOrder();

      const res = await http().get(`/quotations/${quotationId}`).expect(200);
      expect(
        (res.body as { approvalEmailSentAt: string | null })
          .approvalEmailSentAt,
      ).not.toBeNull();
    });

    // Asserted on the diagnosis response itself, not on a re-read: sending
    // reloads the quotation, and the instance issued a moment earlier would
    // otherwise report null on the response that should confirm the send.
    it('says so in the diagnosis response, not only on a re-read', async () => {
      const { approvalEmailSentAt } = await givenQuotedOrder();

      expect(approvalEmailSentAt).not.toBeNull();
    });

    // The link is the only place the raw token ever exists.
    it('stores only the hash of the token', async () => {
      const { quotationId } = await givenQuotedOrder();
      const token = emails.tokenFromLastLink()!;

      const { rows } = await pool.query<{ approval_token_hash: string }>(
        'SELECT approval_token_hash FROM quotations WHERE quotation_id = $1',
        [quotationId],
      );
      expect(rows[0].approval_token_hash).not.toBe(token);
      expect(rows[0].approval_token_hash).toHaveLength(64);
    });
  });

  describe('GET /quotations/approve', () => {
    it('approves the quotation and answers with a readable page', async () => {
      const { orderId } = await givenQuotedOrder();

      const res = await http().get(approvalUrl()).expect(200);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Orçamento aprovado');

      const order = await http().get(`/service-orders/${orderId}`).expect(200);
      expect((order.body as { status: string }).status).toBe(
        'awaiting_execution',
      );
    });

    it('answers 409 in HTML on a second click', async () => {
      await givenQuotedOrder();
      const url = approvalUrl();
      await http().get(url).expect(200);

      const res = await http().get(url).expect(409);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('já foi aprovado');
    });

    it('answers 404 in HTML for an unknown token', async () => {
      await givenQuotedOrder();

      const res = await http()
        .get('/quotations/approve?token=nao-existe')
        .expect(404);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Link inválido');
    });

    it('answers 404 in HTML when the token is missing entirely', async () => {
      const res = await http().get('/quotations/approve').expect(404);

      expect(res.headers['content-type']).toContain('text/html');
    });

    it('answers 410 in HTML once the link has expired', async () => {
      const { quotationId } = await givenQuotedOrder();
      await pool.query(
        `UPDATE quotations SET approval_token_expires_at = now() - interval '1 day' WHERE quotation_id = $1`,
        [quotationId],
      );

      const res = await http().get(approvalUrl()).expect(410);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('expirou');
    });

    // The route is registered before GET /quotations/:id, which would otherwise
    // match "approve" and answer a JSON 400 about it not being a UUID.
    it('is not swallowed by the quotation-by-id route', async () => {
      const res = await http().get('/quotations/approve?token=nao-existe');

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('text/html');
    });
  });

  describe('POST /quotations/:id/send-approval-email', () => {
    it('rotates the token, killing the previous link', async () => {
      const { quotationId } = await givenQuotedOrder();
      const staleUrl = approvalUrl();

      await http()
        .post(`/quotations/${quotationId}/send-approval-email`)
        .expect(200);

      expect(emails.messages).toHaveLength(2);
      await http().get(staleUrl).expect(404);
      await http().get(approvalUrl()).expect(200);
    });

    it('recovers a quotation whose automatic email failed', async () => {
      const { quotationId } = await givenQuotedOrder();
      // Stands in for the send that CompleteDiagnosisUseCase swallowed.
      await pool.query(
        'UPDATE quotations SET approval_email_sent_at = NULL WHERE quotation_id = $1',
        [quotationId],
      );

      await http()
        .post(`/quotations/${quotationId}/send-approval-email`)
        .expect(200);

      const res = await http().get(`/quotations/${quotationId}`).expect(200);
      expect(
        (res.body as { approvalEmailSentAt: string | null })
          .approvalEmailSentAt,
      ).not.toBeNull();
    });

    it('answers 404 in JSON for an unknown quotation', async () => {
      await http()
        .post(
          '/quotations/99999999-9999-4999-8999-999999999999/send-approval-email',
        )
        .expect(404)
        .expect(({ headers }) =>
          expect(headers['content-type']).toContain('application/json'),
        );
    });
  });
});
