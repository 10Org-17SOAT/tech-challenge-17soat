import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CLEANUP_TABLES_WITH_USERS, httpAs, tokenFor } from './fixtures';
import { UserRole } from './../src/modules/auth/roles/role.enum';

describe('Users (e2e)', () => {
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

  beforeEach(async () => {
    for (const table of CLEANUP_TABLES_WITH_USERS) {
      await pool.query(`DELETE FROM ${table}`);
    }
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface UserResponse {
    user_id: string;
    name: string;
    email: string;
    password_hash: string;
    role_id: number;
  }

  interface PaginatedResponse {
    items: UserResponse[];
    total: number;
    page: number;
    limit: number;
  }

  const userBody = (res: request.Response) => res.body as UserResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;

  const validUser = (
    email = `user-${Math.random().toString(36).slice(2, 8)}@example.com`,
  ) => ({
    name: 'Maria Silva',
    email,
    password_hash: 'a-fake-hash-with-min-length',
    role_id: 1,
  });

  describe('POST /user', () => {
    it('creates a user and returns 201', async () => {
      const payload = validUser();
      const body = userBody(
        await http().post('/user').send(payload).expect(201),
      );

      expect(body).toMatchObject({
        name: payload.name,
        email: payload.email,
        role_id: payload.role_id,
      });
      expect(body.user_id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.password_hash).not.toBe(payload.password_hash);
    });

    it('rejects invalid payloads', async () => {
      await http()
        .post('/user')
        .send({ ...validUser(), name: '' })
        .expect(400);
      await http()
        .post('/user')
        .send({ ...validUser(), email: 'not-an-email' })
        .expect(400);
      await http().post('/user').send({ name: 'Only name' }).expect(400);
    });
  });

  describe('GET /user', () => {
    it('paginates users with defaults and metadata', async () => {
      for (let i = 1; i <= 3; i++) {
        await http().post('/user').send(validUser()).expect(201);
      }

      const page = pageBody(await http().get('/user').expect(200));
      expect(page.items).toHaveLength(3);
      expect(page).toMatchObject({ total: 3, page: 1, limit: 20 });
    });

    it('rejects invalid pagination params', async () => {
      await http().get('/user?page=0').expect(400);
      await http().get('/user?limit=abc').expect(400);
    });
  });

  describe('GET /user/:user_id', () => {
    it('returns the user', async () => {
      const payload = validUser();
      const created = userBody(await http().post('/user').send(payload));

      const body = userBody(
        await http().get(`/user/${created.user_id}`).expect(200),
      );
      expect(body).toMatchObject({
        name: payload.name,
        email: payload.email,
        role_id: payload.role_id,
      });
    });

    it('returns 404 for an unknown id and 400 for a malformed uuid', async () => {
      await http()
        .get('/user/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
      await http().get('/user/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /user/:user_id', () => {
    it('updates only the provided fields', async () => {
      const created = userBody(await http().post('/user').send(validUser()));

      const body = userBody(
        await http()
          .patch(`/user/${created.user_id}`)
          .send({ name: 'Nome Atualizado' })
          .expect(200),
      );

      expect(body).toMatchObject({
        name: 'Nome Atualizado',
        email: created.email,
      });
    });

    it('returns 404 for an unknown user', async () => {
      await http()
        .patch('/user/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .send({ name: 'X' })
        .expect(404);
    });
  });

  describe('DELETE /user/:user_id', () => {
    it('deletes the user: 204, then 404 on reads', async () => {
      const created = userBody(await http().post('/user').send(validUser()));

      await http().delete(`/user/${created.user_id}`).expect(204);
      await http().get(`/user/${created.user_id}`).expect(404);
    });
  });
});
