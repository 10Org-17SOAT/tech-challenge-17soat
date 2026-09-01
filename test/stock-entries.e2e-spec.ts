import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { givenUser, httpAs, tokenFor } from './fixtures';
import { UserRole } from './../src/modules/auth/roles/role.enum';

describe('Stock entries (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  // Seeding through the API goes over ADMIN-only routes, whatever role the
  // suite itself exercises.
  let adminToken: string;
  let pool: Pool;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = tokenFor(app, UserRole.STOCK_KEEPER);
    adminToken = tokenFor(app, UserRole.ADMIN);

    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tech_challenge',
    });
  });

  // Movements reference supplies, so they must be cleared first.
  beforeEach(async () => {
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM supplies');
    await pool.query('DELETE FROM stock_keepers');
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface StockEntryResponse {
    movementId: string;
    supplyId: string;
    quantity: number;
    availableBalance: number;
    createdAt: string;
  }

  const entryBody = (res: request.Response) => res.body as StockEntryResponse;

  let sequence = 0;
  const createSupply = async (): Promise<string> => {
    const res = await http()
      .post('/supplies')
      .send({
        name: `Pastilha de freio ${(sequence += 1)}`,
        priceInCents: 8900,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  // beforeEach clears stock_keepers, so a fixed CPF never collides across tests.
  const createStockKeeper = async (): Promise<string> => {
    const userId = (await givenUser(app.getHttpServer(), adminToken)).id;
    const res = await http()
      .post('/stock-keepers')
      .send({
        userId,
        name: 'Estoquista de teste',
        cpf: '52998224725',
        phone: '11987654321',
      })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const balanceOf = async (supplyId: string): Promise<number> => {
    const { rows } = await pool.query<{ total: string }>(
      `select coalesce(sum(quantity), 0) as total
         from stock_movements
        where supply_id = $1 and type = 'IN'`,
      [supplyId],
    );
    return Number(rows[0].total);
  };

  it('registers an entry and raises the available balance by the given quantity', async () => {
    const supplyId = await createSupply();
    const stockKeeperId = await createStockKeeper();

    const body = entryBody(
      await http()
        .post(`/supplies/${supplyId}/stock-entries`)
        .send({ quantity: 12, stockKeeperId })
        .expect(201),
    );

    expect(body).toMatchObject({
      supplyId,
      quantity: 12,
      availableBalance: 12,
    });
    expect(body.movementId).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(balanceOf(supplyId)).resolves.toBe(12);
  });

  it('returns 404 for a supply that does not exist', async () => {
    const stockKeeperId = await createStockKeeper();

    await http()
      .post(`/supplies/${randomUUID()}/stock-entries`)
      .send({ quantity: 3, stockKeeperId })
      .expect(404);
  });

  it('returns 404 for a soft deleted supply', async () => {
    const supplyId = await createSupply();
    const stockKeeperId = await createStockKeeper();
    await http().delete(`/supplies/${supplyId}`).expect(204);

    await http()
      .post(`/supplies/${supplyId}/stock-entries`)
      .send({ quantity: 3, stockKeeperId })
      .expect(404);
  });

  it('returns 404 for a stock keeper that does not exist', async () => {
    const supplyId = await createSupply();

    await http()
      .post(`/supplies/${supplyId}/stock-entries`)
      .send({ quantity: 3, stockKeeperId: randomUUID() })
      .expect(404);

    await expect(balanceOf(supplyId)).resolves.toBe(0);
  });

  it.each([0, -5, 2.5, 'dez'])(
    'returns 400 for the invalid quantity %p',
    async (quantity) => {
      const supplyId = await createSupply();
      const stockKeeperId = await createStockKeeper();

      await http()
        .post(`/supplies/${supplyId}/stock-entries`)
        .send({ quantity, stockKeeperId })
        .expect(400);

      await expect(balanceOf(supplyId)).resolves.toBe(0);
    },
  );

  it('applies concurrent entries for the same supply without a lost update', async () => {
    const supplyId = await createSupply();
    const stockKeeperId = await createStockKeeper();
    const quantities = [5, 8, 13, 21];

    await Promise.all(
      quantities.map((quantity) =>
        http()
          .post(`/supplies/${supplyId}/stock-entries`)
          .send({ quantity, stockKeeperId })
          .expect(201),
      ),
    );

    const expected = quantities.reduce((sum, q) => sum + q, 0);
    await expect(balanceOf(supplyId)).resolves.toBe(expected);
  });
});
