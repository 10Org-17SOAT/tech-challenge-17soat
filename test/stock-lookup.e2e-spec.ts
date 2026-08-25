import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DOMAIN_EVENT_PUBLISHER } from './../src/modules/stock/domain/events/domain-event-publisher';
import { RecordingDomainEventPublisher } from './../src/modules/stock/__test__/recording-domain-event.publisher';

describe('Stock lookup (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let publisher: RecordingDomainEventPublisher;

  beforeAll(async () => {
    publisher = new RecordingDomainEventPublisher();

    // The real adapter is a no-op, so the recording double is the only way to
    // prove the event actually leaves the use case over HTTP.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DOMAIN_EVENT_PUBLISHER)
      .useValue(publisher)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tech_challenge',
    });
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM supplies');
    publisher.events.length = 0;
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  let sequence = 0;
  const createSupply = async (): Promise<string> => {
    const res = await http()
      .post('/supplies')
      .send({ name: `Bomba d'água ${(sequence += 1)}`, priceInCents: 15900 })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const addMovement = (
    supplyId: string,
    type: 'IN' | 'RESERVE',
    quantity: number,
  ) =>
    pool.query(
      `insert into stock_movements
         (movement_id, supply_id, type, quantity, service_order_reference, created_at)
       values ($1, $2, $3, $4, $5, now())`,
      [randomUUID(), supplyId, type, quantity, type === 'IN' ? null : 'OS-e2e'],
    );

  describe('GET /supplies/:id/stock', () => {
    it('returns the available balance of a supply with movements', async () => {
      const supplyId = await createSupply();
      await addMovement(supplyId, 'IN', 10);
      await addMovement(supplyId, 'RESERVE', 4);

      const res = await http().get(`/supplies/${supplyId}/stock`).expect(200);

      expect(res.body).toEqual({ supplyId, availableBalance: 6 });
      expect(publisher.events).toEqual([]);
    });

    it('returns zero and publishes PurchaseRequestNeeded for a supply with no IN movements', async () => {
      const supplyId = await createSupply();

      const res = await http().get(`/supplies/${supplyId}/stock`).expect(200);

      expect(res.body).toEqual({ supplyId, availableBalance: 0 });
      expect(publisher.events).toHaveLength(1);
      expect(publisher.events[0].name).toBe('stock.purchase-request-needed');
    });

    it('returns 404 without publishing an event for an id absent from the catalogue', async () => {
      await http().get(`/supplies/${randomUUID()}/stock`).expect(404);

      expect(publisher.events).toEqual([]);
    });

    it('returns 400 for a malformed uuid', async () => {
      await http().get('/supplies/not-a-uuid/stock').expect(400);
    });
  });

  describe('availableBalance on the catalogue reads', () => {
    it('includes availableBalance on every item of the listing', async () => {
      const stocked = await createSupply();
      const empty = await createSupply();
      await addMovement(stocked, 'IN', 7);

      const res = await http().get('/supplies').expect(200);
      const items = (
        res.body as { items: { id: string; availableBalance: number }[] }
      ).items;

      const balances = new Map(items.map((i) => [i.id, i.availableBalance]));
      expect(balances.get(stocked)).toBe(7);
      expect(balances.get(empty)).toBe(0);
    });

    it('does not publish PurchaseRequestNeeded when listing supplies with zero balance', async () => {
      await createSupply();

      await http().get('/supplies').expect(200);

      expect(publisher.events).toEqual([]);
    });

    it('includes availableBalance on the single supply read', async () => {
      const supplyId = await createSupply();
      await addMovement(supplyId, 'IN', 3);

      const res = await http().get(`/supplies/${supplyId}`).expect(200);

      expect((res.body as { availableBalance: number }).availableBalance).toBe(
        3,
      );
      expect(publisher.events).toEqual([]);
    });
  });
});
