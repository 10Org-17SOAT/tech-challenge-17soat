import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DOMAIN_EVENT_PUBLISHER } from './../src/shared/domain/events/domain-event-publisher';
import { RecordingDomainEventPublisher } from './../src/modules/stock/__test__/recording-domain-event.publisher';

describe('Reservations (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let publisher: RecordingDomainEventPublisher;
  let stockKeeperId: string;

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

    stockKeeperId = await request(app.getHttpServer())
      .post('/stock-keepers')
      .send({ name: 'Estoquista de teste', cpf: '11144477735', phone: '11987654321' })
      .expect(201)
      .then((res) => (res.body as { id: string }).id);
  });

  // Movements reference supplies, so they must be cleared first.
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

  interface ReservationResponse {
    movementId: string;
    supplyId: string;
    quantity: number;
    serviceOrderReference: string;
    availableBalance: number;
    reservedQuantity: number;
    createdAt: string;
  }

  const reservationBody = (res: request.Response) =>
    res.body as ReservationResponse;

  let sequence = 0;
  const createSupplyWithBalance = async (quantity: number): Promise<string> => {
    const res = await http()
      .post('/supplies')
      .send({
        name: `Correia dentada ${(sequence += 1)}`,
        priceInCents: 15900,
      })
      .expect(201);
    const supplyId = (res.body as { id: string }).id;
    await http()
      .post(`/supplies/${supplyId}/stock-entries`)
      .send({ quantity, stockKeeperId })
      .expect(201);
    return supplyId;
  };

  it('reserves a quantity within the available balance, lowering available and raising reserved', async () => {
    const supplyId = await createSupplyWithBalance(10);

    const body = reservationBody(
      await http()
        .post(`/supplies/${supplyId}/reservations`)
        .send({ quantity: 6, serviceOrderReference: 'OS-e2e-1' })
        .expect(201),
    );

    expect(body).toMatchObject({
      supplyId,
      quantity: 6,
      serviceOrderReference: 'OS-e2e-1',
      availableBalance: 4,
      reservedQuantity: 6,
    });
    expect(body.movementId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('rejects a reservation that exceeds the available balance, changing no balance', async () => {
    const supplyId = await createSupplyWithBalance(5);

    await http()
      .post(`/supplies/${supplyId}/reservations`)
      .send({ quantity: 6, serviceOrderReference: 'OS-e2e-2' })
      .expect(409);

    const stock = await http().get(`/supplies/${supplyId}/stock`).expect(200);
    expect((stock.body as { availableBalance: number }).availableBalance).toBe(
      5,
    );
  });

  it('publishes PartReservedForServiceOrder on a successful reservation', async () => {
    const supplyId = await createSupplyWithBalance(10);

    await http()
      .post(`/supplies/${supplyId}/reservations`)
      .send({ quantity: 3, serviceOrderReference: 'OS-e2e-3' })
      .expect(201);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0].name).toBe(
      'stock.part-reserved-for-service-order',
    );
  });

  it('returns 404 for a supply that does not exist', async () => {
    await http()
      .post(`/supplies/${randomUUID()}/reservations`)
      .send({ quantity: 1, serviceOrderReference: 'OS-e2e-4' })
      .expect(404);
  });

  it('returns 400 for an invalid quantity or a blank service order reference', async () => {
    const supplyId = await createSupplyWithBalance(10);

    await http()
      .post(`/supplies/${supplyId}/reservations`)
      .send({ quantity: 0, serviceOrderReference: 'OS-e2e-5' })
      .expect(400);

    await http()
      .post(`/supplies/${supplyId}/reservations`)
      .send({ quantity: 1, serviceOrderReference: '   ' })
      .expect(400);
  });

  it('accepts exactly one of two concurrent reservations where only one fits, and the available balance never goes negative', async () => {
    const supplyId = await createSupplyWithBalance(10);

    const [first, second] = await Promise.all([
      http()
        .post(`/supplies/${supplyId}/reservations`)
        .send({ quantity: 7, serviceOrderReference: 'OS-e2e-A' }),
      http()
        .post(`/supplies/${supplyId}/reservations`)
        .send({ quantity: 7, serviceOrderReference: 'OS-e2e-B' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const stock = await http().get(`/supplies/${supplyId}/stock`).expect(200);
    const availableBalance = (stock.body as { availableBalance: number })
      .availableBalance;
    expect(availableBalance).toBe(3);
    expect(availableBalance).toBeGreaterThanOrEqual(0);
  });
});
