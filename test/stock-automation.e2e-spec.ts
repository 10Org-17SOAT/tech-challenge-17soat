import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  CLEANUP_TABLES,
  givenConsultant,
  givenOwnedVehicle,
  givenUser,
  httpAs,
  tokenFor,
} from './fixtures';
import { ExecutionCompleted } from './../src/modules/mechanic/domain/events/execution-completed.event';
import { ExecutionStarted } from './../src/modules/mechanic/domain/events/execution-started.event';
import type { DomainEvent } from './../src/shared/domain/events/domain-event';
import { UserRole } from '../src/modules/auth/public/roles';

/**
 * The stock automation end to end: nobody calls /reservations or /write-offs
 * here. Approving the quotation is what reserves, and the order reaching
 * `finished` is what writes off — which is the whole point of the feature,
 * and the reason these assertions read the ledger directly rather than the
 * response of a call that no longer happens.
 */
describe('Stock automation (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let pool: Pool;
  let emitter: EventEmitter2;
  let vehicleId: string;
  let openedById: string;
  let stockKeeperId: string;

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

    const stockKeeperUserId = (await givenUser(app.getHttpServer(), token)).id;
    stockKeeperId = await http()
      .post('/stock-keepers')
      .send({
        userId: stockKeeperUserId,
        name: 'Estoquista de teste',
        cpf: '11144477735',
        phone: '11987654321',
      })
      .expect(201)
      .then((res) => (res.body as { id: string }).id);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => httpAs(app, token);
  const unique = () => Math.random().toString(36).slice(2, 10);

  /**
   * The reservation and the write-off both happen on a listener, and the
   * publisher emits without awaiting — so the HTTP call that triggered them
   * has already answered by the time they run. Polling the ledger is what an
   * observer of this system would actually have to do.
   */
  async function eventually(
    assertion: () => Promise<void>,
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

  /** SUM(RESERVE) - SUM(CONSUME) for one supply on one order, straight from the ledger. */
  async function reservedFor(
    supplyId: string,
    orderId: string,
  ): Promise<number> {
    const { rows } = await pool.query<{ total: string }>(
      `SELECT coalesce(sum(
         CASE type WHEN 'RESERVE' THEN quantity WHEN 'CONSUME' THEN -quantity ELSE 0 END
       ), 0) AS total
       FROM stock_movements
       WHERE supply_id = $1 AND service_order_reference = $2`,
      [supplyId, orderId],
    );
    return Number(rows[0].total);
  }

  async function movementTypesFor(
    supplyId: string,
    orderId: string,
  ): Promise<string[]> {
    const { rows } = await pool.query<{ type: string }>(
      `SELECT type FROM stock_movements
       WHERE supply_id = $1 AND service_order_reference = $2
       ORDER BY created_at, type`,
      [supplyId, orderId],
    );
    return rows.map((row) => row.type);
  }

  async function availableBalance(supplyId: string): Promise<number> {
    const res = await http().get(`/supplies/${supplyId}/stock`).expect(200);
    return (res.body as { availableBalance: number }).availableBalance;
  }

  async function givenSupplyWithBalance(quantity: number): Promise<string> {
    const supplyId = await http()
      .post('/supplies')
      .send({ name: `Peca ${unique()}`, priceInCents: 4500 })
      .expect(201)
      .then((res) => (res.body as { id: string }).id);

    if (quantity > 0) {
      await http()
        .post(`/supplies/${supplyId}/stock-entries`)
        .send({ quantity, stockKeeperId })
        .expect(201);
    }
    return supplyId;
  }

  async function givenService(
    supplies: { supplyId: string; quantity: number }[] = [],
  ): Promise<string> {
    const serviceId = await http()
      .post('/services')
      .send({
        name: `Servico ${unique()}`,
        category: 'mechanical',
        laborPriceInCents: 15000,
      })
      .expect(201)
      .then((res) => (res.body as { id: string }).id);

    if (supplies.length > 0) {
      await http()
        .put(`/services/${serviceId}/supplies`)
        .send({ supplies })
        .expect(200);
    }
    return serviceId;
  }

  /** Walks an order all the way to a quotation waiting for the customer. */
  async function givenQuotedOrder(
    serviceId: string,
  ): Promise<{ orderId: string; quotationId: string }> {
    const orderId = await http()
      .post('/service-order/anamnesis')
      .send({
        vehicleId,
        consultantId: openedById,
        mainComplaint: 'Barulho na suspensão',
        problemDescription: 'Estalo ao passar em lombadas',
      })
      .expect(201)
      .then((res) => (res.body as { serviceOrderId: string }).serviceOrderId);

    await http().post(`/service-orders/${orderId}/diagnosis/start`).expect(200);

    const quotationId = await http()
      .post(`/service-orders/${orderId}/diagnosis`)
      .send({
        findings: 'Pastilhas de freio gastas',
        serviceItems: [{ serviceId, quantity: 1 }],
      })
      .expect(201)
      .then((res) => (res.body as { quotation: { id: string } }).quotation.id);

    return { orderId, quotationId };
  }

  describe('approving the quotation', () => {
    it('reserves every part of the approved quotation without any manual call', async () => {
      const oilId = await givenSupplyWithBalance(20);
      const filterId = await givenSupplyWithBalance(20);
      const serviceId = await givenService([
        { supplyId: oilId, quantity: 4 },
        { supplyId: filterId, quantity: 1 },
      ]);
      const { orderId, quotationId } = await givenQuotedOrder(serviceId);

      await http().post(`/quotations/${quotationId}/approve`).expect(200);

      await eventually(async () => {
        expect(await reservedFor(oilId, orderId)).toBe(4);
        expect(await reservedFor(filterId, orderId)).toBe(1);
      });
      // The shelf shrank by exactly what the order now holds.
      expect(await availableBalance(oilId)).toBe(16);
      expect(await availableBalance(filterId)).toBe(19);
    });

    it('reserves nothing for a quotation that is pure labour', async () => {
      const serviceId = await givenService();
      const { quotationId } = await givenQuotedOrder(serviceId);

      await http().post(`/quotations/${quotationId}/approve`).expect(200);

      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*) AS count FROM stock_movements WHERE type = 'RESERVE'`,
      );
      expect(Number(rows[0].count)).toBe(0);
    });

    // A part the workshop does not have must not block the customer's
    // approval: the order advances and the shortage becomes a purchase.
    it('still advances the order when a part is out of stock', async () => {
      const shortId = await givenSupplyWithBalance(1);
      const serviceId = await givenService([
        { supplyId: shortId, quantity: 5 },
      ]);
      const { orderId, quotationId } = await givenQuotedOrder(serviceId);

      await http().post(`/quotations/${quotationId}/approve`).expect(200);

      const order = await http().get(`/service-orders/${orderId}`).expect(200);
      expect((order.body as { status: string }).status).toBe(
        'awaiting_execution',
      );
      expect(await reservedFor(shortId, orderId)).toBe(0);
      expect(await availableBalance(shortId)).toBe(1);
    });
  });

  describe('finishing the order', () => {
    it('writes the reservations off once the execution completes', async () => {
      const oilId = await givenSupplyWithBalance(20);
      const serviceId = await givenService([{ supplyId: oilId, quantity: 4 }]);
      const { orderId, quotationId } = await givenQuotedOrder(serviceId);

      await http().post(`/quotations/${quotationId}/approve`).expect(200);
      await eventually(async () => {
        expect(await reservedFor(oilId, orderId)).toBe(4);
      });

      await emit(new ExecutionStarted(orderId));
      await emit(new ExecutionCompleted(orderId));

      await eventually(async () => {
        expect(await movementTypesFor(oilId, orderId)).toEqual([
          'RESERVE',
          'CONSUME',
        ]);
      });
      // Nothing left committed to the order, and the units are gone for good:
      // a write-off consumes the reservation, it never credits the shelf back.
      expect(await reservedFor(oilId, orderId)).toBe(0);
      expect(await availableBalance(oilId)).toBe(16);
    });

    it('leaves another order reservations untouched', async () => {
      const oilId = await givenSupplyWithBalance(20);
      const serviceId = await givenService([{ supplyId: oilId, quantity: 4 }]);
      const first = await givenQuotedOrder(serviceId);
      const second = await givenQuotedOrder(serviceId);

      await http().post(`/quotations/${first.quotationId}/approve`).expect(200);
      await http()
        .post(`/quotations/${second.quotationId}/approve`)
        .expect(200);
      await eventually(async () => {
        expect(await reservedFor(oilId, second.orderId)).toBe(4);
      });

      await emit(new ExecutionStarted(first.orderId));
      await emit(new ExecutionCompleted(first.orderId));

      await eventually(async () => {
        expect(await reservedFor(oilId, first.orderId)).toBe(0);
      });
      expect(await reservedFor(oilId, second.orderId)).toBe(4);
    });

    it('writes nothing off for an order that reserved no parts', async () => {
      const serviceId = await givenService();
      const { orderId, quotationId } = await givenQuotedOrder(serviceId);
      await http().post(`/quotations/${quotationId}/approve`).expect(200);

      await emit(new ExecutionStarted(orderId));
      await emit(new ExecutionCompleted(orderId));

      const order = await http().get(`/service-orders/${orderId}`).expect(200);
      expect((order.body as { status: string }).status).toBe('finished');
    });
  });
});
