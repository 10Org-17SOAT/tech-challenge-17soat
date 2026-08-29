import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';

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

  // Movements reference supplies, so they must be cleared first.
  beforeEach(async () => {
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM supplies');
  });

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
    availableBalance: number;
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
    it('creates a supply and returns 201', async () => {
      const body = supplyBody(
        await http().post('/supplies').send(validSupply).expect(201),
      );

      expect(body).toMatchObject(validSupply);
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

    it('ignores unknown fields in the payload', async () => {
      const body = supplyBody(
        await http()
          .post('/supplies')
          .send({ ...validSupply, quantity: 99 })
          .expect(201),
      );
      expect(body).not.toHaveProperty('quantity');
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

    describe('name search', () => {
      const seed = async () => {
        for (const name of [
          'Óleo 5W30',
          'Filtro de óleo',
          'Pastilha de freio',
        ]) {
          await http()
            .post('/supplies')
            .send({ name, priceInCents: 100 })
            .expect(201);
        }
      };

      it('filters supplies by a partial, case-insensitive name match', async () => {
        await seed();

        const partial = pageBody(
          await http().get('/supplies?name=de').expect(200),
        );
        expect(partial.items.map((s) => s.name).sort()).toEqual([
          'Filtro de óleo',
          'Pastilha de freio',
        ]);
        expect(partial.total).toBe(2);

        const upper = pageBody(
          await http().get('/supplies?name=PASTILHA').expect(200),
        );
        expect(upper.items.map((s) => s.name)).toEqual(['Pastilha de freio']);
        expect(upper.total).toBe(1);
      });

      it('returns the full listing when the search term is omitted', async () => {
        await seed();

        const all = pageBody(await http().get('/supplies').expect(200));
        expect(all.total).toBe(3);
      });

      it('returns an empty list with total zero when nothing matches', async () => {
        await seed();

        const none = pageBody(
          await http().get('/supplies?name=amortecedor').expect(200),
        );
        expect(none.items).toEqual([]);
        expect(none.total).toBe(0);
      });

      it('does not return soft deleted supplies in the search', async () => {
        await seed();
        const listed = pageBody(
          await http().get('/supplies?name=óleo').expect(200),
        );
        const oil = listed.items.find((s) => s.name === 'Óleo 5W30');

        await http().delete(`/supplies/${oil!.id}`).expect(204);

        const after = pageBody(
          await http().get('/supplies?name=óleo').expect(200),
        );
        expect(after.items.map((s) => s.name)).toEqual(['Filtro de óleo']);
        expect(after.total).toBe(1);
      });

      it('rejects a search term above the maximum length', async () => {
        await http()
          .get(`/supplies?name=${'a'.repeat(256)}`)
          .expect(400);
      });
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
      expect(body).toMatchObject(validSupply);
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

    it('rejects invalid fields and ignores unknown ones', async () => {
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
      expect(body).not.toHaveProperty('quantity');
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
        'SELECT deleted_at FROM supplies WHERE supply_id = $1',
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
