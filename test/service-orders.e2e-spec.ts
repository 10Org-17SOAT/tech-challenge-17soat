import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  CLEANUP_TABLES,
  givenConsultant,
  givenOwnedVehicle,
  givenServiceOrder,
  givenUser,
  httpAs,
  tokenFor,
} from './fixtures';
import { ExecutionCompleted } from './../src/modules/mechanic/domain/events/execution-completed.event';
import { ExecutionStarted } from './../src/modules/mechanic/domain/events/execution-started.event';
import type { DomainEvent } from './../src/shared/domain/events/domain-event';
import { UserRole } from '../src/modules/auth/public/roles';

describe('ServiceOrders (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let pool: Pool;
  // An order is always about a car, so every test needs one first.
  let vehicleId: string;
  // ...and about who opened it.
  let openedById: string;
  // The auth account behind the vehicle's owner, for the ownership checks.
  let ownerUserId: string;
  // The vehicle's owner, for opening orders that reference it.
  let customerId: string;
  let emitter: EventEmitter2;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = tokenFor(app, UserRole.ADMIN);

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

    const owned = await givenOwnedVehicle(app.getHttpServer(), token);
    vehicleId = owned.vehicleId;
    ownerUserId = owned.userId;
    customerId = owned.customerId;
    openedById = await givenConsultant(app.getHttpServer(), token);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface ServiceOrderResponse {
    id: string;
    vehicleId: string;
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

  async function givenVehicle(): Promise<string> {
    const res = await http()
      .post('/vehicles')
      .send({
        licensePlate: `ABC${Math.floor(Math.random() * 9000 + 1000)}`,
        model: 'Gol',
        year: 2020,
        manufacturer: 'Volkswagen',
        color: 'Preto',
        fuelType: 'GASOLINE',
        odometer: 50000,
      })
      .expect(201);
    return (res.body as { vehicle_id: string }).vehicle_id;
  }

  // Reception opens the order (POST /service-orders) and attaches the
  // anamnesis, which the diagnosis requires.
  async function givenOrder(): Promise<{
    serviceOrderId: string;
    vehicleId: string;
  }> {
    const serviceOrderId = await givenServiceOrder(
      app.getHttpServer(),
      token,
      vehicleId,
      openedById,
    );
    return { serviceOrderId, vehicleId };
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
    interface CreatedResponse extends ServiceOrderResponse {
      customerId: string;
      openedByName: string;
      requestedServices: { serviceId: string; quantity: number }[];
      requestedParts: { supplyId: string; quantity: number }[];
    }

    const createdBody = (res: request.Response) => res.body as CreatedResponse;

    async function givenSupply(): Promise<string> {
      const res = await http()
        .post('/supplies')
        .send({
          name: `Peca ${Math.random().toString(36).slice(2, 10)}`,
          priceInCents: 4500,
        })
        .expect(201);
      return (res.body as { id: string }).id;
    }

    async function count(table: string): Promise<number> {
      const { rows } = await pool.query<{ total: string }>(
        `SELECT count(*) AS total FROM ${table}`,
      );
      return Number(rows[0].total);
    }

    // Valid CPF; the e2e database starts empty for every test, so a fixed
    // document cannot collide.
    const newCustomer = (userId: string, document = '52998224725') => ({
      userId,
      personType: 'CPF',
      document,
      name: 'Bruno Lima',
      email: 'bruno.lima@example.com',
      phone: { countryCode: '55', areaCode: '11', number: '988887777' },
      address: {
        street: 'Rua A',
        number: '10',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01001000',
      },
    });

    const newVehicle = (licensePlate = 'XYZ1A23') => ({
      licensePlate,
      model: 'Onix',
      year: 2022,
      manufacturer: 'Chevrolet',
      color: 'Branco',
      fuelType: 'GASOLINE',
      odometer: 12000,
    });

    const unknownId = '6f2c8e0a-0b0e-4f6e-9e1e-000000000000';

    it('opens the order in received for an existing customer and vehicle', async () => {
      const serviceId = await givenService();
      const supplyId = await givenSupply();

      const body = createdBody(
        await http()
          .post('/service-orders')
          .send({
            openedById,
            customer: { id: customerId },
            vehicle: { id: vehicleId },
            services: [{ serviceId, quantity: 1 }],
            parts: [{ supplyId, quantity: 4 }],
            notes: 'Barulho na suspensão',
            vehicleMileageAtEntry: 45000,
          })
          .expect(201),
      );

      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.status).toBe('received');
      expect(body.customerId).toBe(customerId);
      expect(body.vehicleId).toBe(vehicleId);
      expect(body.openedByName).toBe('Carlos Consultor');
      expect(body.notes).toBe('Barulho na suspensão');
      expect(body.requestedServices).toEqual([{ serviceId, quantity: 1 }]);
      expect(body.requestedParts).toEqual([{ supplyId, quantity: 4 }]);

      const order = await http().get(`/service-orders/${body.id}`).expect(200);
      expect(orderBody(order).status).toBe('received');
    });

    it('registers a new customer and vehicle along with the order', async () => {
      const user = await givenUser(app.getHttpServer(), token);

      const body = createdBody(
        await http()
          .post('/service-orders')
          .send({
            openedById,
            customer: newCustomer(user.id),
            vehicle: newVehicle(),
          })
          .expect(201),
      );

      const customer = await http()
        .get(`/customers/${body.customerId}`)
        .expect(200);
      expect((customer.body as { document: string }).document).toBe(
        '52998224725',
      );
      const vehicle = await http()
        .get(`/vehicles/${body.vehicleId}`)
        .expect(200);
      expect(
        vehicle.body as { customerId: string; licensePlate: string },
      ).toMatchObject({ customerId: body.customerId, licensePlate: 'XYZ1A23' });
      expect(body.requestedServices).toEqual([]);
      expect(body.requestedParts).toEqual([]);
    });

    it('reuses the customer and vehicle when document and plate are known', async () => {
      const user = await givenUser(app.getHttpServer(), token);
      const payload = {
        openedById,
        customer: newCustomer(user.id),
        vehicle: newVehicle(),
      };

      const first = createdBody(
        await http().post('/service-orders').send(payload).expect(201),
      );
      const second = createdBody(
        await http().post('/service-orders').send(payload).expect(201),
      );

      expect(second.id).not.toBe(first.id);
      expect(second.customerId).toBe(first.customerId);
      expect(second.vehicleId).toBe(first.vehicleId);
    });

    it('rejects an invalid payload with 400', async () => {
      await http()
        .post('/service-orders')
        .send({ openedById, customer: { id: customerId } })
        .expect(400);
      await http()
        .post('/service-orders')
        .send({
          openedById,
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          services: [{ serviceId: unknownId, quantity: 0 }],
        })
        .expect(400);
      // Same service twice: a typo, not two lines.
      const serviceId = await givenService();
      await http()
        .post('/service-orders')
        .send({
          openedById,
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          services: [
            { serviceId, quantity: 1 },
            { serviceId, quantity: 2 },
          ],
        })
        .expect(400);
    });

    it('rejects customer data only the domain can judge with 400', async () => {
      const user = await givenUser(app.getHttpServer(), token);
      await http()
        .post('/service-orders')
        .send({
          openedById,
          customer: newCustomer(user.id, '12345678900'),
          vehicle: newVehicle(),
        })
        .expect(400);
    });

    it.each([
      ['consultant', () => ({ openedById: unknownId })],
      ['customer', () => ({ customer: { id: unknownId } })],
      ['vehicle', () => ({ vehicle: { id: unknownId } })],
      [
        'service',
        () => ({ services: [{ serviceId: unknownId, quantity: 1 }] }),
      ],
      ['part', () => ({ parts: [{ supplyId: unknownId, quantity: 1 }] })],
    ])('rejects an unknown %s with 422', async (_, override) => {
      await http()
        .post('/service-orders')
        .send({
          openedById,
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          ...override(),
        })
        .expect(422);

      expect(await count('service_orders')).toBe(0);
    });

    it('rejects a vehicle that belongs to another customer with 422', async () => {
      const stranger = await givenOwnedVehicle(app.getHttpServer(), token);
      await http()
        .post('/service-orders')
        .send({
          openedById,
          customer: { id: stranger.customerId },
          vehicle: { id: vehicleId },
        })
        .expect(422);
    });

    it('rejects a plate registered to another customer with 409', async () => {
      const plate = (
        (await http().get(`/vehicles/${vehicleId}`).expect(200)).body as {
          licensePlate: string;
        }
      ).licensePlate;
      const user = await givenUser(app.getHttpServer(), token);

      await http()
        .post('/service-orders')
        .send({
          openedById,
          customer: newCustomer(user.id),
          vehicle: newVehicle(plate),
        })
        .expect(409);
    });

    // The new customer and vehicle are valid; the unknown service is what
    // fails, and it must take them down with it.
    it('persists nothing when a later validation fails', async () => {
      const user = await givenUser(app.getHttpServer(), token);
      const customersBefore = await count('customers');
      const vehiclesBefore = await count('vehicles');

      await http()
        .post('/service-orders')
        .send({
          openedById,
          customer: newCustomer(user.id),
          vehicle: newVehicle(),
          services: [{ serviceId: unknownId, quantity: 1 }],
        })
        .expect(422);

      expect(await count('customers')).toBe(customersBefore);
      expect(await count('vehicles')).toBe(vehiclesBefore);
      expect(await count('service_orders')).toBe(0);
      expect(await count('service_order_requested_services')).toBe(0);
    });
  });

  describe('GET /service-orders', () => {
    it('paginates and filters by status', async () => {
      for (let i = 0; i < 3; i++) {
        await givenOrder();
      }
      const toAdvance = await givenOrder();
      await advanceTo(toAdvance.serviceOrderId, 'in_diagnosis');

      const all = pageBody(await http().get('/service-orders').expect(200));
      expect(all.total).toBe(4);

      const filtered = pageBody(
        await http().get('/service-orders?status=in_diagnosis').expect(200),
      );
      expect(filtered.total).toBe(1);
      expect(filtered.items[0].id).toBe(toAdvance.serviceOrderId);
    });

    it('rejects invalid params', async () => {
      await http().get('/service-orders?page=0').expect(400);
      await http().get('/service-orders?status=unknown').expect(400);
    });
  });

  describe('GET /service-orders/:id', () => {
    it('returns the order or 404', async () => {
      const created = await givenOrder();
      const body = orderBody(
        await http()
          .get(`/service-orders/${created.serviceOrderId}`)
          .expect(200),
      );
      expect(body.id).toBe(created.serviceOrderId);

      await http()
        .get('/service-orders/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
      await http().get('/service-orders/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /service-orders/:id', () => {
    it('updates editable fields', async () => {
      const created = await givenOrder();

      const body = orderBody(
        await http()
          .patch(`/service-orders/${created.serviceOrderId}`)
          .send({ notes: 'novo diagnóstico', vehicleMileageAtEntry: 50000 })
          .expect(200),
      );

      expect(body.notes).toBe('novo diagnóstico');
      expect(body.vehicleMileageAtEntry).toBe(50000);
    });

    it('blocks mileage/scheduledAt edit once in_execution', async () => {
      const created = await givenOrder();
      await advanceTo(created.serviceOrderId, 'in_execution');

      await http()
        .patch(`/service-orders/${created.serviceOrderId}`)
        .send({ vehicleMileageAtEntry: 99999 })
        .expect(400);

      await http()
        .patch(`/service-orders/${created.serviceOrderId}`)
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

  describe('GET /service-orders/:id/status — ownership', () => {
    const asCustomer = (userId: string) =>
      httpAs(app, tokenFor(app, UserRole.CUSTOMER, userId));

    it('lets the owner read the status of their own order', async () => {
      const created = await givenOrder();

      const res = await asCustomer(ownerUserId).get(
        `/service-orders/${created.serviceOrderId}/status`,
      );

      expect(res.status).toBe(200);
      expect((res.body as { status: string }).status).toBe('received');
    });

    // 404, not 403: a customer must not be able to learn which ids exist by
    // probing the endpoint.
    it('hides an order that belongs to another customer', async () => {
      const created = await givenOrder();
      const stranger = await givenOwnedVehicle(app.getHttpServer(), token);

      const res = await asCustomer(stranger.userId).get(
        `/service-orders/${created.serviceOrderId}/status`,
      );

      expect(res.status).toBe(404);
    });

    it('hides the order from a customer account with no profile linked', async () => {
      const created = await givenOrder();

      const res = await httpAs(app, tokenFor(app, UserRole.CUSTOMER)).get(
        `/service-orders/${created.serviceOrderId}/status`,
      );

      expect(res.status).toBe(404);
    });

    it('still lets an admin read any order', async () => {
      const created = await givenOrder();

      const res = await http().get(
        `/service-orders/${created.serviceOrderId}/status`,
      );

      expect(res.status).toBe(200);
    });
  });

  describe('GET /service-orders/:id/status', () => {
    it('returns received for a freshly created order', async () => {
      const created = await givenOrder();

      const status = statusBody(
        await http()
          .get(`/service-orders/${created.serviceOrderId}/status`)
          .expect(200),
      );
      expect(status.status).toBe('received');
    });

    it('walks the whole lifecycle, stamping timestamps + approval', async () => {
      const created = await givenOrder();

      await http()
        .post(`/service-orders/${created.serviceOrderId}/diagnosis/start`)
        .expect(200);
      expect(
        statusBody(
          await http()
            .get(`/service-orders/${created.serviceOrderId}/status`)
            .expect(200),
        ).status,
      ).toBe('in_diagnosis');

      const serviceId = await givenService(15000);
      const diagnosed = await http()
        .post(`/service-orders/${created.serviceOrderId}/diagnosis`)
        .send({
          findings: 'Pastilhas de freio gastas',
          serviceItems: [{ serviceId, quantity: 1 }],
        })
        .expect(201);
      expect(
        statusBody(
          await http()
            .get(`/service-orders/${created.serviceOrderId}/status`)
            .expect(200),
        ).status,
      ).toBe('awaiting_approval');

      const { quotation } = diagnosed.body as CompleteDiagnosisResponse;
      expect(quotation.totalInCents).toBe(15000);

      await http().post(`/quotations/${quotation.id}/approve`).expect(200);
      const approved = orderBody(
        await http()
          .get(`/service-orders/${created.serviceOrderId}`)
          .expect(200),
      );
      expect(approved.status).toBe('awaiting_execution');
      expect(approved.approvedByCustomer).toBe(true);

      await emit(new ExecutionStarted(created.serviceOrderId));
      const started = orderBody(
        await http()
          .get(`/service-orders/${created.serviceOrderId}`)
          .expect(200),
      );
      expect(started.startedAt).not.toBeNull();

      await emit(new ExecutionCompleted(created.serviceOrderId));
      const finished = orderBody(
        await http()
          .get(`/service-orders/${created.serviceOrderId}`)
          .expect(200),
      );
      expect(finished.status).toBe('finished');
      expect(finished.completedAt).not.toBeNull();
    });

    it('ignores events describing an invalid transition and keeps the current status', async () => {
      const created = await givenOrder();

      await emit(new ExecutionCompleted(created.serviceOrderId));

      const status = statusBody(
        await http()
          .get(`/service-orders/${created.serviceOrderId}/status`)
          .expect(200),
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
      const created = await givenOrder();
      await pool.query(
        `UPDATE service_orders
            SET status = 'finished', started_at = $1, completed_at = $2
          WHERE service_order_id = $3`,
        [startedAt, completedAt, created.serviceOrderId],
      );
      return created.serviceOrderId;
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
      const created = await givenOrder();
      await advanceTo(created.serviceOrderId, 'in_execution');

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
      const created = await givenOrder();
      const id = created.serviceOrderId;

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
      const created = await givenOrder();
      await advanceTo(created.serviceOrderId, 'in_diagnosis');

      await http()
        .delete(`/service-orders/${created.serviceOrderId}`)
        .expect(409);
    });
  });
});
