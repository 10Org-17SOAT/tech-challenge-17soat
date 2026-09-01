import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { givenUser, httpAs, tokenFor } from './fixtures';
import { UserRole } from '../src/modules/auth/public/roles';

describe('Stock keepers (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  // Seeding through the API goes over ADMIN-only routes, whatever role the
  // suite itself exercises.
  let adminToken: string;
  let pool: Pool;
  let userId: string;

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

    userId = (await givenUser(app.getHttpServer(), adminToken)).id;
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM stock_keepers');
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface StockKeeperResponse {
    id: string;
    name: string;
    cpf: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
  }

  interface PaginatedResponse {
    items: StockKeeperResponse[];
    total: number;
    page: number;
    limit: number;
  }

  const stockKeeperBody = (res: request.Response) =>
    res.body as StockKeeperResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;

  const validStockKeeper = {
    name: 'Maria Estoquista',
    cpf: '52998224725',
    phone: '11987654321',
  };

  // Generates a valid CPF (mod-11 check digits) for each fixture index — the
  // endpoint validates the CPF, so a hand-mutated suffix would not pass the
  // check-digit algorithm for most indices.
  const checkDigit = (digits: string, weights: number[]): number => {
    const sum = weights.reduce(
      (acc, weight, index) => acc + Number(digits[index]) * weight,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const validCpf = (index: number): string => {
    const base = String(100000000 + index).padStart(9, '0');
    const d1 = checkDigit(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = checkDigit(base + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return `${base}${d1}${d2}`;
  };

  describe('POST /stock-keepers', () => {
    it('creates a stock keeper and returns 201', async () => {
      const body = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({ userId, ...validStockKeeper })
          .expect(201),
      );

      expect(body).toMatchObject(validStockKeeper);
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.createdAt).toBeDefined();
    });

    it('normalizes a formatted CPF and phone', async () => {
      const body = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({
            userId,
            name: 'Maria Estoquista',
            cpf: '529.982.247-25',
            phone: '(11) 98765-4321',
          })
          .expect(201),
      );

      expect(body.cpf).toBe('52998224725');
      expect(body.phone).toBe('11987654321');
    });

    it('rejects invalid payloads', async () => {
      await http()
        .post('/stock-keepers')
        .send({ userId, ...validStockKeeper, name: '' })
        .expect(400);
      await http()
        .post('/stock-keepers')
        .send({ userId, ...validStockKeeper, cpf: '11111111111' })
        .expect(400);
      await http()
        .post('/stock-keepers')
        .send({ userId, ...validStockKeeper, phone: '123' })
        .expect(400);
      await http()
        .post('/stock-keepers')
        .send({ name: 'Maria Estoquista' })
        .expect(400);
    });

    it('ignores unknown fields in the payload', async () => {
      const body = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({ userId, ...validStockKeeper, role: 'admin' })
          .expect(201),
      );
      expect(body).not.toHaveProperty('role');
    });

    it('returns 409 for a duplicated active CPF', async () => {
      await http()
        .post('/stock-keepers')
        .send({ userId, ...validStockKeeper })
        .expect(201);
      await http()
        .post('/stock-keepers')
        .send({ userId, ...validStockKeeper })
        .expect(409);
    });
  });

  describe('GET /stock-keepers', () => {
    it('paginates stock keepers with defaults and metadata', async () => {
      for (let i = 1; i <= 25; i++) {
        await http()
          .post('/stock-keepers')
          .send({
            userId,
            name: `Estoquista ${i}`,
            cpf: validCpf(i),
            phone: '11987654321',
          })
          .expect(201);
      }

      const first = pageBody(await http().get('/stock-keepers').expect(200));
      expect(first.items).toHaveLength(20);
      expect(first).toMatchObject({ total: 25, page: 1, limit: 20 });

      const second = pageBody(
        await http().get('/stock-keepers?page=2&limit=20').expect(200),
      );
      expect(second.items).toHaveLength(5);
      expect(second.page).toBe(2);
    });

    it('rejects invalid pagination params', async () => {
      await http().get('/stock-keepers?page=0').expect(400);
      await http().get('/stock-keepers?limit=abc').expect(400);
    });

    describe('name search', () => {
      const seed = async () => {
        const people = [
          { name: 'Maria Estoquista', cpf: '52998224725' },
          { name: 'Marcos Almoxarife', cpf: '11144477735' },
          { name: 'Joana Silva', cpf: '96432101204' },
        ];
        for (const { name, cpf } of people) {
          await http()
            .post('/stock-keepers')
            .send({ userId, name, cpf, phone: '11987654321' })
            .expect(201);
        }
      };

      it('filters stock keepers by a partial, case-insensitive name match', async () => {
        await seed();

        const partial = pageBody(
          await http().get('/stock-keepers?name=mar').expect(200),
        );
        expect(partial.items.map((s) => s.name).sort()).toEqual([
          'Marcos Almoxarife',
          'Maria Estoquista',
        ]);
        expect(partial.total).toBe(2);

        const upper = pageBody(
          await http().get('/stock-keepers?name=JOANA').expect(200),
        );
        expect(upper.items.map((s) => s.name)).toEqual(['Joana Silva']);
        expect(upper.total).toBe(1);
      });

      it('returns the full listing when the search term is omitted', async () => {
        await seed();

        const all = pageBody(await http().get('/stock-keepers').expect(200));
        expect(all.total).toBe(3);
      });

      it('returns an empty list with total zero when nothing matches', async () => {
        await seed();

        const none = pageBody(
          await http().get('/stock-keepers?name=ninguem').expect(200),
        );
        expect(none.items).toEqual([]);
        expect(none.total).toBe(0);
      });

      it('does not return soft deleted stock keepers in the search', async () => {
        await seed();
        const listed = pageBody(
          await http().get('/stock-keepers?name=mar').expect(200),
        );
        const maria = listed.items.find((s) => s.name === 'Maria Estoquista');

        await http().delete(`/stock-keepers/${maria!.id}`).expect(204);

        const after = pageBody(
          await http().get('/stock-keepers?name=mar').expect(200),
        );
        expect(after.items.map((s) => s.name)).toEqual(['Marcos Almoxarife']);
        expect(after.total).toBe(1);
      });

      it('rejects a search term above the maximum length', async () => {
        await http()
          .get(`/stock-keepers?name=${'a'.repeat(256)}`)
          .expect(400);
      });
    });
  });

  describe('GET /stock-keepers/:id', () => {
    it('returns the stock keeper', async () => {
      const created = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({ userId, ...validStockKeeper }),
      );

      const body = stockKeeperBody(
        await http().get(`/stock-keepers/${created.id}`).expect(200),
      );
      expect(body).toMatchObject(validStockKeeper);
    });

    it('returns 404 for an unknown id and 400 for a malformed uuid', async () => {
      await http()
        .get('/stock-keepers/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
      await http().get('/stock-keepers/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /stock-keepers/:id', () => {
    it('updates only the provided fields', async () => {
      const created = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({ userId, ...validStockKeeper }),
      );

      const body = stockKeeperBody(
        await http()
          .patch(`/stock-keepers/${created.id}`)
          .send({ phone: '11912345678' })
          .expect(200),
      );

      expect(body).toMatchObject({
        name: validStockKeeper.name,
        cpf: validStockKeeper.cpf,
        phone: '11912345678',
      });
    });

    it('returns 404 for an unknown stock keeper', async () => {
      await http()
        .patch('/stock-keepers/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .send({ name: 'X' })
        .expect(404);
    });

    it('rejects invalid fields and ignores unknown ones, including cpf', async () => {
      const created = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({ userId, ...validStockKeeper }),
      );

      await http()
        .patch(`/stock-keepers/${created.id}`)
        .send({ phone: '123' })
        .expect(400);

      const body = stockKeeperBody(
        await http()
          .patch(`/stock-keepers/${created.id}`)
          .send({ cpf: '11144477735' })
          .expect(200),
      );
      expect(body.cpf).toBe(validStockKeeper.cpf);
    });
  });

  describe('DELETE /stock-keepers/:id', () => {
    it('soft deletes: 204, then 404 on reads and gone from listing', async () => {
      const created = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({ userId, ...validStockKeeper }),
      );
      const id = created.id;

      await http().delete(`/stock-keepers/${id}`).expect(204);
      await http().get(`/stock-keepers/${id}`).expect(404);
      await http().delete(`/stock-keepers/${id}`).expect(404);

      const list = pageBody(await http().get('/stock-keepers').expect(200));
      expect(list.total).toBe(0);

      const { rows } = await pool.query<{ deleted_at: Date | null }>(
        'SELECT deleted_at FROM stock_keepers WHERE stock_keeper_id = $1',
        [id],
      );
      expect(rows[0].deleted_at).not.toBeNull();
    });

    it('frees the CPF for a new registration', async () => {
      const created = stockKeeperBody(
        await http()
          .post('/stock-keepers')
          .send({ userId, ...validStockKeeper }),
      );
      await http().delete(`/stock-keepers/${created.id}`).expect(204);

      await http()
        .post('/stock-keepers')
        .send({ userId, ...validStockKeeper })
        .expect(201);
    });
  });
});
