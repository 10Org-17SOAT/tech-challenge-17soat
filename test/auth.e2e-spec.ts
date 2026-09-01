import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CLEANUP_TABLES_WITH_USERS } from './fixtures';
import { UserRole } from '../src/modules/auth/roles/role.enum';

describe('Auth (e2e)', () => {
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

  beforeEach(async () => {
    for (const table of CLEANUP_TABLES_WITH_USERS) {
      await pool.query(`DELETE FROM ${table}`);
    }
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  interface LoginResponse {
    access_token: string;
    user: { user_id: string; email: string; name: string; role_id: number };
  }

  const loginBody = (res: request.Response) => res.body as LoginResponse;

  const password = 'a-fake-password-12345';

  const givenUser = async (
    role_id: UserRole,
    email = `login-${Math.random().toString(36).slice(2, 8)}@example.com`,
  ) => {
    await http()
      .post('/user')
      .send({ name: 'Maria Silva', email, password_hash: password, role_id })
      .expect(201);
    return email;
  };

  const login = async (email: string) => {
    const body = loginBody(
      await http().post('/auth/login').send({ email, password }).expect(200),
    );
    return body.access_token;
  };

  describe('POST /auth/login', () => {
    it('returns an access token and the user for valid credentials', async () => {
      const email = await givenUser(UserRole.CLIENTE);

      const body = loginBody(
        await http().post('/auth/login').send({ email, password }).expect(200),
      );

      expect(body.access_token).toEqual(expect.any(String));
      expect(body.user).toMatchObject({ email, role_id: UserRole.CLIENTE });
    });

    it('rejects an unknown email', async () => {
      await http()
        .post('/auth/login')
        .send({ email: 'missing@example.com', password })
        .expect(401);
    });

    it('rejects a wrong password', async () => {
      const email = await givenUser(UserRole.CLIENTE);

      await http()
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an invalid payload', async () => {
      await http()
        .post('/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated user', async () => {
      const email = await givenUser(UserRole.CLIENTE);
      const token = await login(email);

      const res = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ email, role_id: UserRole.CLIENTE });
    });

    it('rejects a missing token', async () => {
      await http().get('/auth/me').expect(401);
    });

    it('rejects an invalid token', async () => {
      await http()
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });

  describe('GET /auth/admin-only', () => {
    it('allows an admin', async () => {
      const email = await givenUser(UserRole.ADMIN);
      const token = await login(email);

      await http()
        .get('/auth/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('forbids a non-admin', async () => {
      const email = await givenUser(UserRole.CLIENTE);
      const token = await login(email);

      await http()
        .get('/auth/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /auth/technical-only', () => {
    it('allows a consultor tecnico', async () => {
      const email = await givenUser(UserRole.CONSULTOR_TECNICO);
      const token = await login(email);

      await http()
        .get('/auth/technical-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('forbids a cliente', async () => {
      const email = await givenUser(UserRole.CLIENTE);
      const token = await login(email);

      await http()
        .get('/auth/technical-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
