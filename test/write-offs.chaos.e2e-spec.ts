import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DOMAIN_EVENT_PUBLISHER } from './../src/shared/domain/events/domain-event-publisher';
import { RecordingDomainEventPublisher } from './../src/modules/stock/__test__/recording-domain-event.publisher';

describe('Write-offs chaos (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let publisher: RecordingDomainEventPublisher;

  beforeAll(async () => {
    publisher = new RecordingDomainEventPublisher();

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
  const createSupplyWithReservation = async (
    inQuantity: number,
    reservedQuantity: number,
    serviceOrderReference: string,
  ): Promise<string> => {
    const res = await http()
      .post('/supplies')
      .send({
        name: `Correia dentada chaos ${(sequence += 1)}`,
        priceInCents: 15900,
      })
      .expect(201);
    const supplyId = (res.body as { id: string }).id;
    await http()
      .post(`/supplies/${supplyId}/stock-entries`)
      .send({ quantity: inQuantity })
      .expect(201);
    await http()
      .post(`/supplies/${supplyId}/reservations`)
      .send({ quantity: reservedQuantity, serviceOrderReference })
      .expect(201);
    return supplyId;
  };

  describe('concurrency: two write-offs racing the same reservation', () => {
    it('never lets the sum of concurrent write-offs exceed what was reserved', async () => {
      const supplyId = await createSupplyWithReservation(10, 10, 'OS-race-1');

      const [first, second] = await Promise.all([
        http()
          .post(`/supplies/${supplyId}/write-offs`)
          .send({ quantity: 7, serviceOrderReference: 'OS-race-1' }),
        http()
          .post(`/supplies/${supplyId}/write-offs`)
          .send({ quantity: 7, serviceOrderReference: 'OS-race-1' }),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 409]);

      const rows = await pool.query(
        "select coalesce(sum(quantity), 0)::int as total from stock_movements where supply_id = $1 and type = 'CONSUME'",
        [supplyId],
      );
      const totalConsumed = (rows.rows[0] as { total: number }).total;
      expect(totalConsumed).toBe(7);
    });
  });
});
