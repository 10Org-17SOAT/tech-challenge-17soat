import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Supplies (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  beforeEach(() => pool.query('DELETE FROM supplies'));

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  interface SupplyResponse {
    id: string;
    name: string;
    description: string | null;
    priceInCents: number;
    quantity: number;
    createdAt: string;
    updatedAt: string;
  }

  interface PaginatedResponse {
    items: SupplyResponse[];
    total: number;
    page: number;
    limit: number;
  }

  const supplyBody = (res: request.Response) => res.body as SupplyResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;

  const validSupply = {
    name: 'Óleo 5W30',
    description: 'Óleo sintético',
    priceInCents: 4990,
  };

  describe('POST /supplies', () => {
    it('creates a supply with quantity 0 and returns 201', async () => {
      const body = supplyBody(
        await http().post('/supplies').send(validSupply).expect(201),
      );

      expect(body).toMatchObject({ ...validSupply, quantity: 0 });
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.createdAt).toBeDefined();
    });

    it('rejects invalid payloads', async () => {
      await http()
        .post('/supplies')
        .send({ name: '', priceInCents: 100 })
        .expect(400);
      await http()
        .post('/supplies')
        .send({ name: 'Filtro', priceInCents: -5 })
        .expect(400);
      await http()
        .post('/supplies')
        .send({ name: 'Filtro', priceInCents: 10.5 })
        .expect(400);
      await http().post('/supplies').send({ name: 'Filtro' }).expect(400);
    });

    it('does not accept quantity in the payload', async () => {
      const body = supplyBody(
        await http()
          .post('/supplies')
          .send({ ...validSupply, quantity: 99 })
          .expect(201),
      );
      expect(body.quantity).toBe(0);
    });

    it('returns 409 for a duplicated active name', async () => {
      await http().post('/supplies').send(validSupply).expect(201);
      await http().post('/supplies').send(validSupply).expect(409);
    });
  });

  describe('GET /supplies', () => {
    it('paginates supplies with defaults and metadata', async () => {
      for (let i = 1; i <= 25; i++) {
        await http()
          .post('/supplies')
          .send({ name: `Supply ${i}`, priceInCents: 100 })
          .expect(201);
      }

      const first = pageBody(await http().get('/supplies').expect(200));
      expect(first.items).toHaveLength(20);
      expect(first).toMatchObject({ total: 25, page: 1, limit: 20 });

      const second = pageBody(
        await http().get('/supplies?page=2&limit=20').expect(200),
      );
      expect(second.items).toHaveLength(5);
      expect(second.page).toBe(2);
    });

    it('rejects invalid pagination params', async () => {
      await http().get('/supplies?page=0').expect(400);
      await http().get('/supplies?limit=abc').expect(400);
    });
  });

  describe('GET /supplies/:id', () => {
    it('returns the supply', async () => {
      const created = supplyBody(
        await http().post('/supplies').send(validSupply),
      );

      const body = supplyBody(
        await http().get(`/supplies/${created.id}`).expect(200),
      );
      expect(body).toMatchObject({ ...validSupply, quantity: 0 });
    });

    it('returns 404 for an unknown id and 400 for a malformed uuid', async () => {
      await http()
        .get('/supplies/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
      await http().get('/supplies/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /supplies/:id', () => {
    it('updates only the provided fields', async () => {
      const created = supplyBody(
        await http().post('/supplies').send(validSupply),
      );

      const body = supplyBody(
        await http()
          .patch(`/supplies/${created.id}`)
          .send({ priceInCents: 6990 })
          .expect(200),
      );

      expect(body).toMatchObject({
        name: validSupply.name,
        priceInCents: 6990,
      });
    });

    it('returns 404 for unknown supply and 409 for duplicated name', async () => {
      await http()
        .patch('/supplies/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .send({ name: 'X' })
        .expect(404);

      await http().post('/supplies').send(validSupply).expect(201);
      const other = supplyBody(
        await http()
          .post('/supplies')
          .send({ name: 'Filtro de ar', priceInCents: 1000 })
          .expect(201),
      );

      await http()
        .patch(`/supplies/${other.id}`)
        .send({ name: validSupply.name })
        .expect(409);
    });

    it('rejects invalid fields and quantity changes', async () => {
      const created = supplyBody(
        await http().post('/supplies').send(validSupply),
      );

      await http()
        .patch(`/supplies/${created.id}`)
        .send({ priceInCents: -1 })
        .expect(400);

      const body = supplyBody(
        await http()
          .patch(`/supplies/${created.id}`)
          .send({ quantity: 50 })
          .expect(200),
      );
      expect(body.quantity).toBe(0);
    });
  });

  describe('DELETE /supplies/:id', () => {
    it('soft deletes: 204, then 404 on reads and gone from listing', async () => {
      const created = supplyBody(
        await http().post('/supplies').send(validSupply),
      );
      const id = created.id;

      await http().delete(`/supplies/${id}`).expect(204);
      await http().get(`/supplies/${id}`).expect(404);
      await http().delete(`/supplies/${id}`).expect(404);

      const list = pageBody(await http().get('/supplies').expect(200));
      expect(list.total).toBe(0);

      const { rows } = await pool.query<{ deleted_at: Date | null }>(
        'SELECT deleted_at FROM supplies WHERE id = $1',
        [id],
      );
      expect(rows[0].deleted_at).not.toBeNull();
    });

    it('frees the name for a new registration', async () => {
      const created = supplyBody(
        await http().post('/supplies').send(validSupply),
      );
      await http().delete(`/supplies/${created.id}`).expect(204);

      await http().post('/supplies').send(validSupply).expect(201);
    });
  });
});
