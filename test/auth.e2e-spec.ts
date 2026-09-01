import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CLEANUP_TABLES_WITH_USERS, httpAs, tokenFor } from './fixtures';
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

  // Creating a user is itself an ADMIN route now, so this helper needs a
  // token of its own before it can seed the user the test logs in as.
  const givenUser = async (
    role_id: UserRole,
    email = `login-${Math.random().toString(36).slice(2, 8)}@example.com`,
  ) => {
    await httpAs(app, tokenFor(app, UserRole.ADMIN))
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
      const email = await givenUser(UserRole.CUSTOMER);

      const body = loginBody(
        await http().post('/auth/login').send({ email, password }).expect(200),
      );

      expect(body.access_token).toEqual(expect.any(String));
      expect(body.user).toMatchObject({ email, role_id: UserRole.CUSTOMER });
    });

    it('rejects an unknown email', async () => {
      await http()
        .post('/auth/login')
        .send({ email: 'missing@example.com', password })
        .expect(401);
    });

    it('rejects a wrong password', async () => {
      const email = await givenUser(UserRole.CUSTOMER);

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
      const email = await givenUser(UserRole.CUSTOMER);
      const token = await login(email);

      const res = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ email, role_id: UserRole.CUSTOMER });
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

  describe('role enforcement on real routes', () => {
    it('lets a stock keeper reach the stock context', async () => {
      const email = await givenUser(UserRole.STOCK_KEEPER);
      const token = await login(email);

      const res = await http()
        .get('/supplies')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('forbids a customer outside the order status endpoint', async () => {
      const email = await givenUser(UserRole.CUSTOMER);
      const token = await login(email);

      const res = await http()
        .get('/supplies')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('rejects an anonymous request to a protected route', async () => {
      const res = await http().get('/supplies');

      expect(res.status).toBe(401);
    });

    it('keeps login and the root route public', async () => {
      const root = await http().get('/');
      expect(root.status).toBe(200);

      // 401 rather than 403: the route is reachable without a token, it just
      // rejects the unknown credentials.
      const login = await http()
        .post('/auth/login')
        .send({ email: 'missing@example.com', password });
      expect(login.status).toBe(401);
    });
  });
});
