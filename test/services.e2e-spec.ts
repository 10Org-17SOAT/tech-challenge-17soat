import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { httpAs, tokenFor } from './fixtures';
import { UserRole } from './../src/modules/auth/roles/role.enum';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Services (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let pool: Pool;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = tokenFor(app, UserRole.ADMIN);

    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tech_challenge',
    });
  });

  beforeEach(() => pool.query('DELETE FROM services'));

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface ServiceResponse {
    id: string;
    name: string;
    description: string | null;
    category: string;
    laborPriceInCents: number;
    estimatedDuration: number | null;
    warrantyDays: number | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }

  interface PaginatedResponse {
    items: ServiceResponse[];
    total: number;
    page: number;
    limit: number;
  }

  const serviceBody = (res: request.Response) => res.body as ServiceResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;

  const validService = {
    name: 'Troca de óleo',
    description: 'Inclui filtro',
    category: 'mechanical',
    laborPriceInCents: 9990,
  };

  describe('POST /services', () => {
    it('creates a service and returns 201', async () => {
      const body = serviceBody(
        await http().post('/services').send(validService).expect(201),
      );

      expect(body).toMatchObject(validService);
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.active).toBe(true);
      expect(body.estimatedDuration).toBeNull();
      expect(body.warrantyDays).toBeNull();
      expect(body.createdAt).toBeDefined();
    });

    it('creates a service with optional fields', async () => {
      const body = serviceBody(
        await http()
          .post('/services')
          .send({ ...validService, estimatedDuration: 60, warrantyDays: 30 })
          .expect(201),
      );

      expect(body.estimatedDuration).toBe(60);
      expect(body.warrantyDays).toBe(30);
    });

    it('rejects invalid payloads', async () => {
      await http()
        .post('/services')
        .send({ name: '', category: 'mechanical', laborPriceInCents: 100 })
        .expect(400);
      await http()
        .post('/services')
        .send({ name: 'X', category: 'mechanical', laborPriceInCents: -5 })
        .expect(400);
      await http()
        .post('/services')
        .send({
          name: 'X',
          category: 'invalid_category',
          laborPriceInCents: 100,
        })
        .expect(400);
      await http()
        .post('/services')
        .send({ name: 'X', laborPriceInCents: 100 })
        .expect(400);
    });

    it('ignores unknown fields in the payload', async () => {
      const body = serviceBody(
        await http()
          .post('/services')
          .send({ ...validService, foo: 'bar' })
          .expect(201),
      );
      expect(body).not.toHaveProperty('foo');
    });

    it('returns 409 for a duplicated active name', async () => {
      await http().post('/services').send(validService).expect(201);
      await http().post('/services').send(validService).expect(409);
    });
  });

  describe('GET /services', () => {
    it('paginates services with defaults and metadata', async () => {
      for (let i = 1; i <= 25; i++) {
        await http()
          .post('/services')
          .send({
            name: `Service ${i}`,
            category: 'mechanical',
            laborPriceInCents: 100,
          })
          .expect(201);
      }

      const first = pageBody(await http().get('/services').expect(200));
      expect(first.items).toHaveLength(20);
      expect(first).toMatchObject({ total: 25, page: 1, limit: 20 });

      const second = pageBody(
        await http().get('/services?page=2&limit=20').expect(200),
      );
      expect(second.items).toHaveLength(5);
      expect(second.page).toBe(2);
    });

    it('rejects invalid pagination params', async () => {
      await http().get('/services?page=0').expect(400);
      await http().get('/services?limit=abc').expect(400);
    });
  });

  describe('GET /services/:id', () => {
    it('returns the service', async () => {
      const created = serviceBody(
        await http().post('/services').send(validService),
      );

      const body = serviceBody(
        await http().get(`/services/${created.id}`).expect(200),
      );
      expect(body).toMatchObject(validService);
    });

    it('returns 404 for an unknown id and 400 for a malformed uuid', async () => {
      await http()
        .get('/services/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
      await http().get('/services/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /services/:id', () => {
    it('updates only the provided fields', async () => {
      const created = serviceBody(
        await http().post('/services').send(validService),
      );

      const body = serviceBody(
        await http()
          .patch(`/services/${created.id}`)
          .send({ laborPriceInCents: 12000 })
          .expect(200),
      );

      expect(body).toMatchObject({
        name: validService.name,
        laborPriceInCents: 12000,
      });
    });

    it('deactivates a service via active flag', async () => {
      const created = serviceBody(
        await http().post('/services').send(validService),
      );

      const body = serviceBody(
        await http()
          .patch(`/services/${created.id}`)
          .send({ active: false })
          .expect(200),
      );

      expect(body.active).toBe(false);
    });

    it('returns 404 for unknown service and 409 for duplicated name', async () => {
      await http()
        .patch('/services/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .send({ name: 'X' })
        .expect(404);

      await http().post('/services').send(validService).expect(201);
      const other = serviceBody(
        await http()
          .post('/services')
          .send({
            name: 'Alinhamento',
            category: 'tire',
            laborPriceInCents: 4000,
          })
          .expect(201),
      );

      await http()
        .patch(`/services/${other.id}`)
        .send({ name: validService.name })
        .expect(409);
    });

    it('rejects invalid fields and ignores unknown ones', async () => {
      const created = serviceBody(
        await http().post('/services').send(validService),
      );

      await http()
        .patch(`/services/${created.id}`)
        .send({ laborPriceInCents: -1 })
        .expect(400);

      const body = serviceBody(
        await http()
          .patch(`/services/${created.id}`)
          .send({ foo: 50 })
          .expect(200),
      );
      expect(body).not.toHaveProperty('foo');
    });
  });

  describe('DELETE /services/:id', () => {
    it('soft deletes: 204, then 404 on reads and gone from listing', async () => {
      const created = serviceBody(
        await http().post('/services').send(validService),
      );
      const id = created.id;

      await http().delete(`/services/${id}`).expect(204);
      await http().get(`/services/${id}`).expect(404);
      await http().delete(`/services/${id}`).expect(404);

      const list = pageBody(await http().get('/services').expect(200));
      expect(list.total).toBe(0);

      const { rows } = await pool.query<{ deleted_at: Date | null }>(
        'SELECT deleted_at FROM services WHERE service_id = $1',
        [id],
      );
      expect(rows[0].deleted_at).not.toBeNull();
    });

    it('frees the name for a new registration after deletion', async () => {
      const created = serviceBody(
        await http().post('/services').send(validService),
      );
      await http().delete(`/services/${created.id}`).expect(204);

      await http().post('/services').send(validService).expect(201);
    });
  });
});
