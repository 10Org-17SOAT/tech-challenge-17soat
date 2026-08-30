import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DOMAIN_EVENT_PUBLISHER } from './../src/shared/domain/events/domain-event-publisher';
import { RecordingDomainEventPublisher } from './../src/modules/stock/__test__/recording-domain-event.publisher';

describe('Write-offs (e2e)', () => {
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
      .send({
        name: 'Estoquista de teste',
        cpf: '22255588846',
        phone: '11987654321',
      })
      .expect(201)
      .then((res) => (res.body as { id: string }).id);
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

  interface WriteOffResponse {
    movementId: string;
    supplyId: string;
    quantity: number;
    serviceOrderReference: string;
    reservedQuantity: number;
    createdAt: string;
  }

  const writeOffBody = (res: request.Response) => res.body as WriteOffResponse;

  let sequence = 0;
  const createSupplyWithReservation = async (
    inQuantity: number,
    reservedQuantity: number,
    serviceOrderReference: string,
  ): Promise<string> => {
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
      .send({ quantity: inQuantity, stockKeeperId })
      .expect(201);
    await http()
      .post(`/supplies/${supplyId}/reservations`)
      .send({ quantity: reservedQuantity, serviceOrderReference })
      .expect(201);
    return supplyId;
  };

  it('writes off a reserved quantity, lowering the reserved quantity without changing the available balance', async () => {
    const supplyId = await createSupplyWithReservation(10, 6, 'OS-wo-1');

    const body = writeOffBody(
      await http()
        .post(`/supplies/${supplyId}/write-offs`)
        .send({ quantity: 4, serviceOrderReference: 'OS-wo-1' })
        .expect(201),
    );

    expect(body).toMatchObject({
      supplyId,
      quantity: 4,
      serviceOrderReference: 'OS-wo-1',
      reservedQuantity: 2,
    });

    const stock = await http().get(`/supplies/${supplyId}/stock`).expect(200);
    expect((stock.body as { availableBalance: number }).availableBalance).toBe(
      4,
    );
  });

  it('rejects a write-off greater than what is currently reserved', async () => {
    const supplyId = await createSupplyWithReservation(10, 4, 'OS-wo-2');

    await http()
      .post(`/supplies/${supplyId}/write-offs`)
      .send({ quantity: 5, serviceOrderReference: 'OS-wo-2' })
      .expect(409);
  });

  it('publishes PartWrittenOffFromStock on a successful write-off', async () => {
    const supplyId = await createSupplyWithReservation(10, 5, 'OS-wo-3');

    await http()
      .post(`/supplies/${supplyId}/write-offs`)
      .send({ quantity: 5, serviceOrderReference: 'OS-wo-3' })
      .expect(201);

    expect(publisher.events).toHaveLength(2);
    expect(publisher.events[1].name).toBe('stock.part-written-off-from-stock');
  });

  it('returns 404 for a supply that does not exist', async () => {
    await http()
      .post(`/supplies/${randomUUID()}/write-offs`)
      .send({ quantity: 1, serviceOrderReference: 'OS-wo-4' })
      .expect(404);
  });

  it('returns 404 for a service order reference with no matching reservation', async () => {
    const supplyId = await createSupplyWithReservation(10, 5, 'OS-wo-5');

    await http()
      .post(`/supplies/${supplyId}/write-offs`)
      .send({ quantity: 1, serviceOrderReference: 'OS-does-not-exist' })
      .expect(404);
  });

  it('returns 400 for an invalid quantity or a blank service order reference', async () => {
    const supplyId = await createSupplyWithReservation(10, 5, 'OS-wo-6');

    await http()
      .post(`/supplies/${supplyId}/write-offs`)
      .send({ quantity: 0, serviceOrderReference: 'OS-wo-6' })
      .expect(400);

    await http()
      .post(`/supplies/${supplyId}/write-offs`)
      .send({ quantity: 1, serviceOrderReference: '   ' })
      .expect(400);
  });
});
