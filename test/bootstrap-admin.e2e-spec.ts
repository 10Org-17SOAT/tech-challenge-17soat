import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { UserRole } from './../src/modules/auth/roles/role.enum';
import { CLEANUP_TABLES_WITH_USERS, httpAs, tokenFor } from './fixtures';

/**
 * The bootstrap administrator is the one account that cannot be created
 * through the API, so it is the only way into a fresh deployment. Its absence
 * would lock everyone out, which is why it is covered end to end.
 */
describe('Bootstrap admin (e2e)', () => {
  const email = 'bootstrap-admin@example.com';
  const password = 'uma-senha-bem-forte-123';

  let pool: Pool;

  beforeAll(() => {
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
  });

  const bootApp = async (env: {
    BOOTSTRAP_ADMIN_EMAIL?: string;
    BOOTSTRAP_ADMIN_PASSWORD?: string;
  }): Promise<INestApplication<App>> => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = env.BOOTSTRAP_ADMIN_EMAIL ?? '';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = env.BOOTSTRAP_ADMIN_PASSWORD ?? '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    return app;
  };

  it('creates an admin that can log in and reach an ADMIN route', async () => {
    const app = await bootApp({
      BOOTSTRAP_ADMIN_EMAIL: email,
      BOOTSTRAP_ADMIN_PASSWORD: password,
    });

    try {
      const login = await httpAs(app, '')
        .post('/auth/login')
        .send({ email, password });

      expect(login.status).toBe(200);
      const body = login.body as {
        access_token: string;
        user: { role_id: number };
      };
      expect(body.user.role_id).toBe(UserRole.ADMIN);

      const users = await httpAs(app, body.access_token).get('/user');
      expect(users.status).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('does not create anything when the credentials are absent', async () => {
    const app = await bootApp({});

    try {
      const res = await httpAs(app, tokenFor(app, UserRole.ADMIN)).get('/user');

      expect(res.status).toBe(200);
      expect((res.body as { total: number }).total).toBe(0);
    } finally {
      await app.close();
    }
  });

  // Runs on every boot, so a restart must not fail or duplicate the account.
  it('is idempotent across restarts', async () => {
    const first = await bootApp({
      BOOTSTRAP_ADMIN_EMAIL: email,
      BOOTSTRAP_ADMIN_PASSWORD: password,
    });
    await first.close();

    const second = await bootApp({
      BOOTSTRAP_ADMIN_EMAIL: email,
      BOOTSTRAP_ADMIN_PASSWORD: password,
    });

    try {
      const res = await httpAs(second, tokenFor(second, UserRole.ADMIN)).get(
        '/user',
      );

      expect(res.status).toBe(200);
      expect((res.body as { total: number }).total).toBe(1);
    } finally {
      await second.close();
    }
  });
});
