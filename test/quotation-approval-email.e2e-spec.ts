import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { EMAIL_SENDER } from './../src/modules/service-management/notifications/domain/email-sender.port';
import { RecordingEmailSender } from './../src/modules/service-management/notifications/__test__/recording-email.sender';
import {
  CLEANUP_TABLES,
  givenConsultant,
  givenOwnedVehicle,
  httpAs,
  tokenFor,
} from './fixtures';
import { UserRole } from '../src/modules/auth/public/roles';

/**
 * The whole decision path over HTTP: a diagnosis emails the quotation, the
 * link in that email opens a page, and the customer's answer — approval or
 * rejection — arrives by POST, from that page's form or from any other caller
 * holding the token.
 *
 * EMAIL_SENDER is replaced by a recorder — the suite must never reach Brevo,
 * and the raw token only exists inside the message, since the database keeps
 * nothing but its hash. Extracting it from the captured HTML is the only way
 * to get at it, which is exactly the guarantee being asserted.
 */
describe('Quotation approval by email (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let pool: Pool;
  let emails: RecordingEmailSender;
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
    token = tokenFor(app, UserRole.ADMIN);

    for (const table of CLEANUP_TABLES) {
      await pool.query(`DELETE FROM ${table}`);
    }

    const owned = await givenOwnedVehicle(app.getHttpServer(), token);
    vehicleId = owned.vehicleId;
    customerEmail = owned.email;
    openedById = await givenConsultant(app.getHttpServer(), token);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await pool.end();
  });

  const http = () => httpAs(app, token);
  const unique = () => Math.random().toString(36).slice(2, 10);

  async function givenQuotedOrder(): Promise<{
    orderId: string;
    quotationId: string;
    totalInCents: number;
    approvalEmailSentAt: string | null;
    serviceId: string;
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
      .post('/service-order/anamnesis')
      .send({
        vehicleId,
        consultantId: openedById,
        mainComplaint: 'Barulho na suspensão',
        problemDescription: 'Estalo ao passar em lombadas',
      })
      .expect(201);
    const orderId = (order.body as { serviceOrderId: string }).serviceOrderId;
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
      serviceId,
    };
  }

  const lastToken = () => emails.tokenFromLastLink()!;
  const decisionPageUrl = (token = lastToken()) =>
    `/quotations/decision?token=${encodeURIComponent(token)}`;

  type QuotationBody = {
    id: string;
    status: string;
    approvedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
  };

  // No bearer token on purpose: the decision routes are public, and the
  // emailed token is the only credential they take.
  const anonymous = () => request(app.getHttpServer());

  const decide = (body: object) =>
    anonymous().post('/quotations/decision').send(body);

  const confirmForm = (form: Record<string, string>) =>
    anonymous().post('/quotations/decision/confirm').type('form').send(form);

  const orderStatus = async (orderId: string) =>
    (
      (await http().get(`/service-orders/${orderId}`).expect(200)).body as {
        status: string;
      }
    ).status;

  describe('completing a diagnosis', () => {
    it('emails the quotation to the owner of the vehicle', async () => {
      const { totalInCents } = await givenQuotedOrder();

      const sent = emails.messagesFor('awaiting_approval');
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe(customerEmail);
      expect(sent[0].html).toContain(
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

  describe('the email', () => {
    it('offers both answers, each opening the decision page', async () => {
      await givenQuotedOrder();
      const html = emails.messagesFor('awaiting_approval').at(-1)!.html;

      expect(html).toContain('Aprovar orçamento');
      expect(html).toContain('Recusar');
      expect(html).toContain(
        `/quotations/decision?token=${encodeURIComponent(lastToken())}&amp;decision=approved`,
      );
      expect(html).toContain(
        `/quotations/decision?token=${encodeURIComponent(lastToken())}&amp;decision=rejected`,
      );
    });
  });

  describe('GET /quotations/decision', () => {
    it('shows the quotation with both answers, in HTML, without a session', async () => {
      await givenQuotedOrder();

      const res = await anonymous().get(decisionPageUrl()).expect(200);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Confirmar aprovação');
      expect(res.text).toContain('Confirmar recusa');
    });

    it('offers the answer clicked in the email first', async () => {
      await givenQuotedOrder();

      const res = await anonymous()
        .get(`${decisionPageUrl()}&decision=rejected`)
        .expect(200);

      expect(res.text).toContain('Confirmar recusa');
      expect(res.text).not.toContain('Confirmar aprovação');
      expect(res.text).toContain('Prefiro aprovar');
    });

    // Mail scanners open links. Opening this one must decide nothing.
    it('changes nothing, however many times it is opened', async () => {
      const { orderId, quotationId } = await givenQuotedOrder();

      await anonymous().get(`${decisionPageUrl()}&decision=approved`);
      await anonymous().get(`${decisionPageUrl()}&decision=rejected`);

      expect(await orderStatus(orderId)).toBe('awaiting_approval');
      const quotation = await http()
        .get(`/quotations/${quotationId}`)
        .expect(200);
      expect((quotation.body as QuotationBody).status).toBe('issued');
    });

    it('shows where a decided quotation stands instead of the forms', async () => {
      await givenQuotedOrder();
      await decide({ token: lastToken(), decision: 'approved' }).expect(200);

      const res = await anonymous().get(decisionPageUrl()).expect(200);

      expect(res.text).toContain('Orçamento aprovado');
      expect(res.text).not.toContain('<form');
    });

    it('answers 404 in HTML for an unknown token', async () => {
      const res = await anonymous()
        .get('/quotations/decision?token=nao-existe')
        .expect(404);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Link inválido');
    });

    it('answers 404 in HTML when the token is missing entirely', async () => {
      const res = await anonymous().get('/quotations/decision').expect(404);

      expect(res.headers['content-type']).toContain('text/html');
    });

    it('answers 410 in HTML once the link has expired', async () => {
      const { quotationId } = await givenQuotedOrder();
      await pool.query(
        `UPDATE quotations SET approval_token_expires_at = now() - interval '1 day' WHERE quotation_id = $1`,
        [quotationId],
      );

      const res = await anonymous().get(decisionPageUrl()).expect(410);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('expirou');
    });

    // Registered before GET /quotations/:id, which would otherwise match
    // "decision" and answer a JSON 400 about it not being a UUID.
    it('is not swallowed by the quotation-by-id route', async () => {
      const res = await anonymous().get(
        '/quotations/decision?token=nao-existe',
      );

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('text/html');
    });
  });

  // Links emailed before the decision page existed.
  describe('GET /quotations/approve', () => {
    it('forwards to the decision page instead of approving', async () => {
      const { orderId } = await givenQuotedOrder();

      const res = await anonymous()
        .get(`/quotations/approve?token=${encodeURIComponent(lastToken())}`)
        .expect(302);

      expect(res.headers.location).toBe(
        `decision?token=${encodeURIComponent(lastToken())}&decision=approved`,
      );
      expect(await orderStatus(orderId)).toBe('awaiting_approval');
    });
  });

  describe('POST /quotations/decision/confirm (the page form)', () => {
    it('approves and answers with a readable page', async () => {
      const { orderId } = await givenQuotedOrder();

      const res = await confirmForm({
        token: lastToken(),
        decision: 'approved',
      }).expect(200);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Orçamento aprovado');
      expect(await orderStatus(orderId)).toBe('awaiting_execution');
    });

    it('rejects with the reason typed in, sending the order back', async () => {
      const { orderId, quotationId } = await givenQuotedOrder();

      const res = await confirmForm({
        token: lastToken(),
        decision: 'rejected',
        reason: 'Vou fazer em outra oficina',
      }).expect(200);

      expect(res.text).toContain('Orçamento recusado');
      expect(await orderStatus(orderId)).toBe('in_diagnosis');
      const quotation = await http()
        .get(`/quotations/${quotationId}`)
        .expect(200);
      expect((quotation.body as QuotationBody).rejectionReason).toBe(
        'Vou fazer em outra oficina',
      );
    });

    it('answers a resubmitted form with the same result page', async () => {
      await givenQuotedOrder();
      const form = { token: lastToken(), decision: 'rejected' };
      await confirmForm(form).expect(200);

      const res = await confirmForm(form).expect(200);

      expect(res.text).toContain('Orçamento recusado');
    });

    it('answers 409 in HTML for the opposite answer', async () => {
      await givenQuotedOrder();
      await confirmForm({ token: lastToken(), decision: 'approved' }).expect(
        200,
      );

      const res = await confirmForm({
        token: lastToken(),
        decision: 'rejected',
      }).expect(409);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('já foi aprovado');
    });

    it('answers 400 in HTML for a tampered decision', async () => {
      await givenQuotedOrder();

      const res = await confirmForm({
        token: lastToken(),
        decision: 'talvez',
      }).expect(400);

      expect(res.headers['content-type']).toContain('text/html');
    });

    it('answers 404 in HTML for an unknown token', async () => {
      const res = await confirmForm({
        token: 'nao-existe',
        decision: 'approved',
      }).expect(404);

      expect(res.headers['content-type']).toContain('text/html');
    });
  });

  describe('POST /quotations/decision (JSON)', () => {
    it('approves, advancing the order', async () => {
      const { orderId, quotationId } = await givenQuotedOrder();

      const res = await decide({
        token: lastToken(),
        decision: 'approved',
      }).expect(200);

      const body = res.body as QuotationBody;
      expect(body.id).toBe(quotationId);
      expect(body.status).toBe('approved');
      expect(body.approvedAt).not.toBeNull();
      expect(body.rejectedAt).toBeNull();
      expect(await orderStatus(orderId)).toBe('awaiting_execution');
    });

    it('rejects, persisting when and why, and sends the order back', async () => {
      const { orderId, quotationId } = await givenQuotedOrder();

      const res = await decide({
        token: lastToken(),
        decision: 'rejected',
        reason: 'Muito caro',
      }).expect(200);

      const body = res.body as QuotationBody;
      expect(body.status).toBe('rejected');
      expect(body.rejectedAt).not.toBeNull();
      expect(body.rejectionReason).toBe('Muito caro');
      expect(body.approvedAt).toBeNull();
      expect(await orderStatus(orderId)).toBe('in_diagnosis');

      const { rows } = await pool.query<{
        status: string;
        rejected_at: Date | null;
        rejection_reason: string | null;
      }>(
        'SELECT status, rejected_at, rejection_reason FROM quotations WHERE quotation_id = $1',
        [quotationId],
      );
      expect(rows[0].status).toBe('rejected');
      expect(rows[0].rejected_at).not.toBeNull();
      expect(rows[0].rejection_reason).toBe('Muito caro');
    });

    describe('idempotency', () => {
      it('answers a repeated approval with 200 and the same state', async () => {
        await givenQuotedOrder();
        const first = await decide({
          token: lastToken(),
          decision: 'approved',
        }).expect(200);

        const second = await decide({
          token: lastToken(),
          decision: 'approved',
        }).expect(200);

        expect((second.body as QuotationBody).approvedAt).toBe(
          (first.body as QuotationBody).approvedAt,
        );
      });

      it('answers a repeated rejection with 200, keeping the first reason', async () => {
        await givenQuotedOrder();
        await decide({
          token: lastToken(),
          decision: 'rejected',
          reason: 'Muito caro',
        }).expect(200);

        const second = await decide({
          token: lastToken(),
          decision: 'rejected',
          reason: 'Outro motivo',
        }).expect(200);

        expect((second.body as QuotationBody).rejectionReason).toBe(
          'Muito caro',
        );
      });

      it('answers 409 when rejecting what was approved', async () => {
        await givenQuotedOrder();
        await decide({ token: lastToken(), decision: 'approved' }).expect(200);

        await decide({ token: lastToken(), decision: 'rejected' }).expect(409);
      });

      it('answers 409 when approving what was rejected', async () => {
        const { orderId } = await givenQuotedOrder();
        await decide({ token: lastToken(), decision: 'rejected' }).expect(200);

        await decide({ token: lastToken(), decision: 'approved' }).expect(409);
        expect(await orderStatus(orderId)).toBe('in_diagnosis');
      });
    });

    it('answers 401 for an unknown token', async () => {
      await givenQuotedOrder();

      await decide({ token: 'nao-existe', decision: 'approved' })
        .expect(401)
        .expect(({ headers }) =>
          expect(headers['content-type']).toContain('application/json'),
        );
    });

    it('answers 401 once the link has expired', async () => {
      const { quotationId } = await givenQuotedOrder();
      await pool.query(
        `UPDATE quotations SET approval_token_expires_at = now() - interval '1 day' WHERE quotation_id = $1`,
        [quotationId],
      );

      await decide({ token: lastToken(), decision: 'approved' }).expect(401);
    });

    // An unknown order behind a valid token cannot happen through the API —
    // orders are only soft-deleted while still `received` — so it is forced.
    it('answers 404 when the order behind the quotation is gone', async () => {
      const { orderId } = await givenQuotedOrder();
      await pool.query(
        'UPDATE service_orders SET deleted_at = now() WHERE service_order_id = $1',
        [orderId],
      );

      await decide({ token: lastToken(), decision: 'approved' }).expect(404);
    });

    it('answers 400 for a body it cannot read', async () => {
      await decide({ token: 'qualquer', decision: 'talvez' }).expect(400);
      await decide({ decision: 'approved' }).expect(400);
      await decide({
        token: 'qualquer',
        decision: 'rejected',
        reason: 'x'.repeat(501),
      }).expect(400);
    });
  });

  // The point of sending the order back: the workshop can quote it again.
  describe('after a rejection', () => {
    it('lets the diagnosis be completed again, issuing and emailing a new quotation', async () => {
      const { orderId, quotationId, serviceId } = await givenQuotedOrder();
      const firstToken = lastToken();
      await decide({ token: firstToken, decision: 'rejected' }).expect(200);

      const diagnosis = await http()
        .post(`/service-orders/${orderId}/diagnosis`)
        .send({
          findings: 'Só a pastilha dianteira',
          serviceItems: [{ serviceId, quantity: 1 }],
        })
        .expect(201);
      const second = (diagnosis.body as { quotation: QuotationBody }).quotation;

      expect(second.id).not.toBe(quotationId);
      expect(second.status).toBe('issued');
      expect(emails.messagesFor('awaiting_approval')).toHaveLength(2);
      expect(lastToken()).not.toBe(firstToken);
      expect(await orderStatus(orderId)).toBe('awaiting_approval');

      // The order's quotation is now the new one; the rejected one stays.
      const current = await http()
        .get(`/service-orders/${orderId}/quotation`)
        .expect(200);
      expect((current.body as QuotationBody).id).toBe(second.id);
      const rejected = await http()
        .get(`/quotations/${quotationId}`)
        .expect(200);
      expect((rejected.body as QuotationBody).status).toBe('rejected');

      // And the new one can be approved from its own email.
      await decide({ token: lastToken(), decision: 'approved' }).expect(200);
      expect(await orderStatus(orderId)).toBe('awaiting_execution');
    });

    it('still refuses the old link', async () => {
      const { orderId, serviceId } = await givenQuotedOrder();
      const firstToken = lastToken();
      await decide({ token: firstToken, decision: 'rejected' }).expect(200);
      await http()
        .post(`/service-orders/${orderId}/diagnosis`)
        .send({
          findings: 'Revisado',
          serviceItems: [{ serviceId, quantity: 1 }],
        })
        .expect(201);

      await decide({ token: firstToken, decision: 'approved' }).expect(409);
      expect(await orderStatus(orderId)).toBe('awaiting_approval');
    });
  });

  describe('POST /quotations/:id/send-approval-email', () => {
    it('rotates the token, killing the previous link', async () => {
      const { quotationId } = await givenQuotedOrder();
      const staleToken = lastToken();

      await http()
        .post(`/quotations/${quotationId}/send-approval-email`)
        .expect(200);

      expect(emails.messagesFor('awaiting_approval')).toHaveLength(2);
      await anonymous().get(decisionPageUrl(staleToken)).expect(404);
      await decide({ token: staleToken, decision: 'approved' }).expect(401);
      await decide({ token: lastToken(), decision: 'approved' }).expect(200);
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
