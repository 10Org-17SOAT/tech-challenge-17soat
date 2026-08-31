import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CLEANUP_TABLES, givenOwnedVehicle } from './fixtures';
import { ExecutionCompleted } from './../src/modules/service-management/service-orders/domain/events/execution-completed.event';
import { ExecutionStarted } from './../src/modules/service-management/service-orders/domain/events/execution-started.event';
import type { DomainEvent } from './../src/shared/domain/events/domain-event';

describe('ServiceOrders (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  // An order is always about a car, so every test needs one first.
  let vehicleId: string;
  let emitter: EventEmitter2;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    emitter = app.get(EventEmitter2);

    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tech_challenge',
    });
  });

  // quotations, diagnostics and service_items all point at service_orders by
  // foreign key, so they have to go first.
  beforeEach(async () => {
    for (const table of CLEANUP_TABLES) {
      await pool.query(`DELETE FROM ${table}`);
    }

    vehicleId = (await givenOwnedVehicle(app.getHttpServer())).vehicleId;
  });

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

  interface StatusResponse {
    status: string;
  }

  const orderBody = (res: request.Response) => res.body as ServiceOrderResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;
  const statusBody = (res: request.Response) => res.body as StatusResponse;

  async function emit(event: DomainEvent): Promise<void> {
    await emitter.emitAsync(event.name, event);
  }

  interface CompleteDiagnosisResponse {
    quotation: { id: string; totalInCents: number };
  }

  async function givenService(laborPriceInCents = 15000): Promise<string> {
    const res = await http()
      .post('/services')
      .send({
        name: `Servico ${Math.random().toString(36).slice(2, 10)}`,
        category: 'mechanical',
        laborPriceInCents,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  // Up to awaiting_execution the order advances through this module's own
  // endpoints — diagnosis and quotation live here, so they are direct calls.
  // Execution still belongs to the mechanic module, which does not exist yet,
  // so those two transitions are still driven by the domain events it will
  // eventually publish.
  async function advanceTo(id: string, target: string): Promise<void> {
    if (target === 'received') return;

    await http().post(`/service-orders/${id}/diagnosis/start`).expect(200);
    if (target === 'in_diagnosis') return;

    const serviceId = await givenService();
    const diagnosed = await http()
      .post(`/service-orders/${id}/diagnosis`)
      .send({
        findings: 'Pastilhas de freio gastas',
        serviceItems: [{ serviceId, quantity: 1 }],
      })
      .expect(201);
    if (target === 'awaiting_approval') return;

    const { quotation } = diagnosed.body as CompleteDiagnosisResponse;
    await http().post(`/quotations/${quotation.id}/approve`).expect(200);
    if (target === 'awaiting_execution') return;

    await emit(new ExecutionStarted(id));
    if (target === 'in_execution') return;

    await emit(new ExecutionCompleted(id));
  }

  describe('POST /service-orders', () => {
    it('creates an order in status received with defaults', async () => {
      const body = orderBody(
        await http().post('/service-orders').send({ vehicleId }).expect(201),
      );

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
            vehicleId,
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
        .send({ vehicleId, vehicleMileageAtEntry: -1 })
        .expect(400);
      await http()
        .post('/service-orders')
        .send({ vehicleId, vehicleMileageAtEntry: 10.5 })
        .expect(400);
    });

    it('ignores unknown fields', async () => {
      const body = orderBody(
        await http()
          .post('/service-orders')
          .send({ vehicleId, foo: 'bar' })
          .expect(201),
      );
      expect(body).not.toHaveProperty('foo');
    });
  });

  describe('GET /service-orders', () => {
    it('paginates and filters by status', async () => {
      for (let i = 0; i < 3; i++) {
        await http().post('/service-orders').send({ vehicleId }).expect(201);
      }
      const toAdvance = orderBody(
        await http().post('/service-orders').send({ vehicleId }).expect(201),
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
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );
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
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );

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
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );
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

  describe('GET /service-orders/:id/status', () => {
    it('returns received for a freshly created order', async () => {
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );

      const status = statusBody(
        await http().get(`/service-orders/${created.id}/status`).expect(200),
      );
      expect(status.status).toBe('received');
    });

    it('walks the whole lifecycle, stamping timestamps + approval', async () => {
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );

      await http()
        .post(`/service-orders/${created.id}/diagnosis/start`)
        .expect(200);
      expect(
        statusBody(
          await http().get(`/service-orders/${created.id}/status`).expect(200),
        ).status,
      ).toBe('in_diagnosis');

      const serviceId = await givenService(15000);
      const diagnosed = await http()
        .post(`/service-orders/${created.id}/diagnosis`)
        .send({
          findings: 'Pastilhas de freio gastas',
          serviceItems: [{ serviceId, quantity: 1 }],
        })
        .expect(201);
      expect(
        statusBody(
          await http().get(`/service-orders/${created.id}/status`).expect(200),
        ).status,
      ).toBe('awaiting_approval');

      const { quotation } = diagnosed.body as CompleteDiagnosisResponse;
      expect(quotation.totalInCents).toBe(15000);

      await http().post(`/quotations/${quotation.id}/approve`).expect(200);
      const approved = orderBody(
        await http().get(`/service-orders/${created.id}`).expect(200),
      );
      expect(approved.status).toBe('awaiting_execution');
      expect(approved.approvedByCustomer).toBe(true);

      await emit(new ExecutionStarted(created.id));
      const started = orderBody(
        await http().get(`/service-orders/${created.id}`).expect(200),
      );
      expect(started.startedAt).not.toBeNull();

      await emit(new ExecutionCompleted(created.id));
      const finished = orderBody(
        await http().get(`/service-orders/${created.id}`).expect(200),
      );
      expect(finished.status).toBe('finished');
      expect(finished.completedAt).not.toBeNull();
    });

    it('ignores events describing an invalid transition and keeps the current status', async () => {
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );

      await emit(new ExecutionCompleted(created.id));

      const status = statusBody(
        await http().get(`/service-orders/${created.id}/status`).expect(200),
      );
      expect(status.status).toBe('received');
    });

    it('returns 404 for unknown id', async () => {
      await http()
        .get('/service-orders/6f2c8e0a-0b0e-4f6e-9e1e-000000000000/status')
        .expect(404);
    });
  });

  describe('GET /service-orders/average-execution-time', () => {
    interface AverageExecutionTimeResponse {
      averageExecutionTimeMinutes: number | null;
      sampleSize: number;
    }

    const averageBody = (res: request.Response) =>
      res.body as AverageExecutionTimeResponse;

    // `transitionTo` stamps the timestamps with the wall clock, so an order
    // that took a known number of hours has to be planted straight into the
    // table. What the endpoint reads is the SQL aggregate, not the entity.
    async function givenFinishedOrder(
      startedAt: string,
      completedAt: string,
    ): Promise<string> {
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );
      await pool.query(
        `UPDATE service_orders
            SET status = 'finished', started_at = $1, completed_at = $2
          WHERE service_order_id = $3`,
        [startedAt, completedAt, created.id],
      );
      return created.id;
    }

    const average = () => http().get('/service-orders/average-execution-time');

    it('averages bench time across finished orders', async () => {
      await givenFinishedOrder(
        '2026-08-10T09:00:00Z',
        '2026-08-10T13:00:00Z', // 240 min
      );
      await givenFinishedOrder(
        '2026-08-11T09:00:00Z',
        '2026-08-11T11:00:00Z', // 120 min
      );

      const body = averageBody(await average().expect(200));

      expect(body).toEqual({
        averageExecutionTimeMinutes: 180,
        sampleSize: 2,
      });
    });

    it('returns null with a zero sample when no order has finished', async () => {
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );
      await advanceTo(created.id, 'in_execution');

      const body = averageBody(await average().expect(200));

      expect(body).toEqual({
        averageExecutionTimeMinutes: null,
        sampleSize: 0,
      });
    });

    it('recorta por completedAt, inclusivo nas duas pontas', async () => {
      // Started before the window, finished on its first instant.
      await givenFinishedOrder('2026-07-31T20:00:00Z', '2026-08-01T00:00:00Z');
      // Finished exactly on the upper bound.
      await givenFinishedOrder('2026-08-31T21:00:00Z', '2026-08-31T23:00:00Z');
      // Finished past the window: must not weigh in.
      await givenFinishedOrder('2026-09-01T09:00:00Z', '2026-09-01T19:00:00Z');

      const body = averageBody(
        await average()
          .query({
            from: '2026-08-01T00:00:00Z',
            to: '2026-08-31T23:00:00Z',
          })
          .expect(200),
      );

      expect(body).toEqual({
        averageExecutionTimeMinutes: 180,
        sampleSize: 2,
      });
    });

    it('honours the timezone offset the caller sends', async () => {
      // 20:00 in Sao Paulo is 23:00 UTC — a window closed at "31/08 23:59:59"
      // local must still catch it.
      await givenFinishedOrder('2026-08-31T21:00:00Z', '2026-08-31T23:00:00Z');

      const body = averageBody(
        await average()
          .query({
            from: '2026-08-01T00:00:00-03:00',
            to: '2026-08-31T23:59:59-03:00',
          })
          .expect(200),
      );

      expect(body.sampleSize).toBe(1);
    });

    it('ignores soft-deleted orders', async () => {
      const deleted = await givenFinishedOrder(
        '2026-08-10T09:00:00Z',
        '2026-08-10T19:00:00Z', // 600 min, would skew the average
      );
      await pool.query(
        'UPDATE service_orders SET deleted_at = now() WHERE service_order_id = $1',
        [deleted],
      );
      await givenFinishedOrder('2026-08-11T09:00:00Z', '2026-08-11T11:00:00Z');

      const body = averageBody(await average().expect(200));

      expect(body).toEqual({
        averageExecutionTimeMinutes: 120,
        sampleSize: 1,
      });
    });

    it('rejects a window whose start is after its end', async () => {
      await average()
        .query({ from: '2026-08-31T00:00:00Z', to: '2026-08-01T00:00:00Z' })
        .expect(400);
    });

    // Pins the route ordering: were this handler ever moved below
    // `@Get(':id')`, the literal path would hit the UUID param check and this
    // would come back 400 instead of 200.
    it('is not swallowed by the :id route', async () => {
      await average().expect(200);
    });
  });

  describe('DELETE /service-orders/:id', () => {
    it('soft deletes an order in received', async () => {
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );
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
      const created = orderBody(
        await http().post('/service-orders').send({ vehicleId }),
      );
      await advanceTo(created.id, 'in_diagnosis');

      await http().delete(`/service-orders/${created.id}`).expect(409);
    });
  });
});
