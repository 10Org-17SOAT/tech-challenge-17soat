import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('ServiceOrders (e2e)', () => {
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

  beforeEach(() => pool.query('DELETE FROM service_orders'));

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  interface ServiceOrderResponse {
    id: string;
    status: string;
    approvedByCustomer: boolean;
    notes: string | null;
    vehicleMileageAtEntry: number | null;
    scheduledAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }

  interface PaginatedResponse {
    items: ServiceOrderResponse[];
    total: number;
    page: number;
    limit: number;
  }

  const orderBody = (res: request.Response) => res.body as ServiceOrderResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;

  async function advanceTo(id: string, target: string): Promise<void> {
    const path: Record<string, string[]> = {
      in_diagnosis: ['in_diagnosis'],
      awaiting_approval: ['in_diagnosis', 'awaiting_approval'],
      awaiting_execution: [
        'in_diagnosis',
        'awaiting_approval',
        'awaiting_execution',
      ],
      in_execution: [
        'in_diagnosis',
        'awaiting_approval',
        'awaiting_execution',
        'in_execution',
      ],
      finished: [
        'in_diagnosis',
        'awaiting_approval',
        'awaiting_execution',
        'in_execution',
        'finished',
      ],
    };
    for (const step of path[target] ?? []) {
      await http()
        .patch(`/service-orders/${id}/status`)
        .send({ status: step })
        .expect(200);
    }
  }

  describe('POST /service-orders', () => {
    it('creates an order in status received with defaults', async () => {
      const body = orderBody(await http().post('/service-orders').send({}).expect(201));

      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.status).toBe('received');
      expect(body.approvedByCustomer).toBe(false);
      expect(body.notes).toBeNull();
      expect(body.vehicleMileageAtEntry).toBeNull();
      expect(body.scheduledAt).toBeNull();
      expect(body.startedAt).toBeNull();
      expect(body.completedAt).toBeNull();
    });

    it('accepts optional fields', async () => {
      const scheduledAt = new Date('2026-09-01T10:00:00Z').toISOString();
      const body = orderBody(
        await http()
          .post('/service-orders')
          .send({
            notes: '  batida no farol  ',
            vehicleMileageAtEntry: 45000,
            scheduledAt,
          })
          .expect(201),
      );

      expect(body.notes).toBe('batida no farol');
      expect(body.vehicleMileageAtEntry).toBe(45000);
      expect(body.scheduledAt).toBe(scheduledAt);
    });

    it('rejects invalid mileage', async () => {
      await http()
        .post('/service-orders')
        .send({ vehicleMileageAtEntry: -1 })
        .expect(400);
      await http()
        .post('/service-orders')
        .send({ vehicleMileageAtEntry: 10.5 })
        .expect(400);
    });

    it('ignores unknown fields', async () => {
      const body = orderBody(
        await http().post('/service-orders').send({ foo: 'bar' }).expect(201),
      );
      expect(body).not.toHaveProperty('foo');
    });
  });

  describe('GET /service-orders', () => {
    it('paginates and filters by status', async () => {
      for (let i = 0; i < 3; i++) {
        await http().post('/service-orders').send({}).expect(201);
      }
      const toAdvance = orderBody(
        await http().post('/service-orders').send({}).expect(201),
      );
      await advanceTo(toAdvance.id, 'in_diagnosis');

      const all = pageBody(await http().get('/service-orders').expect(200));
      expect(all.total).toBe(4);

      const filtered = pageBody(
        await http().get('/service-orders?status=in_diagnosis').expect(200),
      );
      expect(filtered.total).toBe(1);
      expect(filtered.items[0].id).toBe(toAdvance.id);
    });

    it('rejects invalid params', async () => {
      await http().get('/service-orders?page=0').expect(400);
      await http().get('/service-orders?status=unknown').expect(400);
    });
  });

  describe('GET /service-orders/:id', () => {
    it('returns the order or 404', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));
      const body = orderBody(
        await http().get(`/service-orders/${created.id}`).expect(200),
      );
      expect(body.id).toBe(created.id);

      await http()
        .get('/service-orders/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
      await http().get('/service-orders/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /service-orders/:id', () => {
    it('updates editable fields', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));

      const body = orderBody(
        await http()
          .patch(`/service-orders/${created.id}`)
          .send({ notes: 'novo diagnóstico', vehicleMileageAtEntry: 50000 })
          .expect(200),
      );

      expect(body.notes).toBe('novo diagnóstico');
      expect(body.vehicleMileageAtEntry).toBe(50000);
    });

    it('blocks mileage/scheduledAt edit once in_execution', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));
      await advanceTo(created.id, 'in_execution');

      await http()
        .patch(`/service-orders/${created.id}`)
        .send({ vehicleMileageAtEntry: 99999 })
        .expect(400);

      await http()
        .patch(`/service-orders/${created.id}`)
        .send({ notes: 'ainda edita' })
        .expect(200);
    });

    it('returns 404 for unknown id', async () => {
      await http()
        .patch('/service-orders/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .send({ notes: 'x' })
        .expect(404);
    });
  });

  describe('PATCH /service-orders/:id/status', () => {
    it('walks the happy path and stamps timestamps + approval', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));

      const inDiag = orderBody(
        await http()
          .patch(`/service-orders/${created.id}/status`)
          .send({ status: 'in_diagnosis' })
          .expect(200),
      );
      expect(inDiag.status).toBe('in_diagnosis');

      await http()
        .patch(`/service-orders/${created.id}/status`)
        .send({ status: 'awaiting_approval' })
        .expect(200);

      const approved = orderBody(
        await http()
          .patch(`/service-orders/${created.id}/status`)
          .send({ status: 'awaiting_execution' })
          .expect(200),
      );
      expect(approved.approvedByCustomer).toBe(true);

      const started = orderBody(
        await http()
          .patch(`/service-orders/${created.id}/status`)
          .send({ status: 'in_execution' })
          .expect(200),
      );
      expect(started.startedAt).not.toBeNull();

      const finished = orderBody(
        await http()
          .patch(`/service-orders/${created.id}/status`)
          .send({ status: 'finished' })
          .expect(200),
      );
      expect(finished.completedAt).not.toBeNull();
    });

    it('rejects invalid transitions with 409', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));
      await http()
        .patch(`/service-orders/${created.id}/status`)
        .send({ status: 'finished' })
        .expect(409);
      await http()
        .patch(`/service-orders/${created.id}/status`)
        .send({ status: 'received' })
        .expect(409);
    });

    it('rejects unknown status with 400', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));
      await http()
        .patch(`/service-orders/${created.id}/status`)
        .send({ status: 'nope' })
        .expect(400);
    });
  });

  describe('DELETE /service-orders/:id', () => {
    it('soft deletes an order in received', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));
      const id = created.id;

      await http().delete(`/service-orders/${id}`).expect(204);
      await http().get(`/service-orders/${id}`).expect(404);
      await http().delete(`/service-orders/${id}`).expect(404);

      const list = pageBody(await http().get('/service-orders').expect(200));
      expect(list.total).toBe(0);

      const { rows } = await pool.query<{ deleted_at: Date | null }>(
        'SELECT deleted_at FROM service_orders WHERE service_order_id = $1',
        [id],
      );
      expect(rows[0].deleted_at).not.toBeNull();
    });

    it('refuses to delete once past received with 409', async () => {
      const created = orderBody(await http().post('/service-orders').send({}));
      await advanceTo(created.id, 'in_diagnosis');

      await http().delete(`/service-orders/${created.id}`).expect(409);
    });
  });
});
