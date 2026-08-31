import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Anamnesis (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let vehicleId: string;

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
    await pool.query('DELETE FROM quotation_items');
    await pool.query('DELETE FROM quotations');
    await pool.query('DELETE FROM diagnostics');
    await pool.query('DELETE FROM service_items');
    await pool.query('DELETE FROM anamneses');
    await pool.query('DELETE FROM service_orders');
    await pool.query('DELETE FROM services');
    vehicleId = await givenVehicle();
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  interface AnamnesisResponse {
    id: string;
    serviceOrderId: string;
    vehicleId: string;
    consultantId: string;
    updatedBy: string | null;
    mainComplaint: string;
    problemDescription: string;
    problemStartedAt: string | null;
    howStarted: string | null;
    evolution: string | null;
    occurrenceConditions: string | null;
    frequency: string | null;
    severity: string | null;
    previousOccurrences: string | null;
    recentMaintenance: string | null;
    warningLights: boolean | null;
    unusualNoisesSmells: string | null;
    behaviorChanges: string | null;
    usageConditions: string | null;
    customerObservations: string | null;
    createdAt: string;
    updatedAt: string;
  }

  const anamnesisBody = (res: request.Response) => res.body as AnamnesisResponse;

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

  async function givenAnamnesis(): Promise<AnamnesisResponse> {
    const res = await http()
.post('/anamnesis')
      .send({
        vehicleId,
        consultantId: '22222222-2222-4222-8222-222222222222',
        mainComplaint: 'Barulho na suspensão',
        problemDescription: 'Estalo ao passar em lombadas',
      })
      .expect(201);
    return anamnesisBody(res);
  }

.post('/anamnesis')
          .send({
            vehicleId,
            consultantId: '22222222-2222-4222-8222-222222222222',
            mainComplaint: '  Barulho na suspensão  ',
            problemDescription: 'Estalo ao passar em lombadas',
            frequency: 'intermittent',
          })
          .expect(201),
      );

      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.serviceOrderId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.vehicleId).toBe(vehicleId);
      expect(body.mainComplaint).toBe('Barulho na suspensão');
      expect(body.frequency).toBe('intermittent');
      expect(body.updatedBy).toBeNull();
      expect(body.createdAt).toBeDefined();

      const order = await http()
        .get(`/service-orders/${body.serviceOrderId}`)
        .expect(200);
      expect((order.body as { status: string }).status).toBe('received');
    });

    it('rejects an unknown vehicle with 422 (AC-02)', async () => {
      await http()
.post('/anamnesis')
        .send({
          vehicleId: '6f2c8e0a-0b0e-4f6e-9e1e-000000000000',
          consultantId: '22222222-2222-4222-8222-222222222222',
          mainComplaint: 'Barulho',
          problemDescription: 'Estalo',
        })
        .expect(422);
    });

    it('rejects missing mandatory fields with 400 (AC-03)', async () => {
      await http()
.post('/anamnesis')
        .send({
          vehicleId,
          consultantId: '22222222-2222-4222-8222-222222222222',
        })
        .expect(400);
      await http()
.post('/anamnesis')
        .send({
          vehicleId,
          mainComplaint: 'Barulho',
          problemDescription: 'Estalo',
        })
        .expect(400);
    });

    it('rejects an invalid enum with 400 (AC-04)', async () => {
      await http()
.post('/anamnesis')
        .send({
          vehicleId,
          consultantId: '22222222-2222-4222-8222-222222222222',
          mainComplaint: 'Barulho',
          problemDescription: 'Estalo',
          frequency: 'always',
        })
        .expect(400);
    });
  });

  describe('GET /service-orders/:serviceOrderId/anamnesis', () => {
    it('returns the anamnesis with vehicleId derived from the OS (AC-05)', async () => {
      const created = await givenAnamnesis();

      const body = anamnesisBody(
        await http()
          .get(`/service-orders/${created.serviceOrderId}/anamnesis`)
          .expect(200),
      );
      expect(body.id).toBe(created.id);
      expect(body.vehicleId).toBe(vehicleId);
    });

    it('returns 404 for an order without an anamnesis (AC-06)', async () => {
      const created = await givenAnamnesis();
      await http()
        .delete(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(204);

      await http()
        .get(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(404);
    });

    it('returns 404 for an unknown order', async () => {
      await http()
        .get('/service-orders/6f2c8e0a-0b0e-4f6e-9e1e-000000000000/anamnesis')
        .expect(404);
    });
  });

  describe('PATCH /service-orders/:serviceOrderId/anamnesis', () => {
    it('updates fields, setting updatedBy and updatedAt (AC-07)', async () => {
      const created = await givenAnamnesis();

      const body = anamnesisBody(
        await http()
          .patch(`/service-orders/${created.serviceOrderId}/anamnesis`)
          .send({
            updatedBy: '44444444-4444-4444-8444-444444444444',
            mainComplaint: 'Barulho ao frear',
            severity: 'severe',
          })
          .expect(200),
      );

      expect(body.mainComplaint).toBe('Barulho ao frear');
      expect(body.severity).toBe('severe');
      expect(body.updatedBy).toBe('44444444-4444-4444-8444-444444444444');
      expect(new Date(body.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime(),
      );
    });

    it('returns 409 once the order leaves received (AC-08)', async () => {
      const created = await givenAnamnesis();
      await http()
        .post(`/service-orders/${created.serviceOrderId}/diagnosis/start`)
        .expect(200);

      await http()
        .patch(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .send({
          updatedBy: '44444444-4444-4444-8444-444444444444',
          mainComplaint: 'X',
        })
        .expect(409);
    });

    it('returns 400 when updatedBy is missing (AC-09)', async () => {
      const created = await givenAnamnesis();

      await http()
        .patch(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .send({ mainComplaint: 'X' })
        .expect(400);
    });
  });

  describe('DELETE /service-orders/:serviceOrderId/anamnesis', () => {
    it('soft deletes and a subsequent GET returns 404 (AC-10)', async () => {
      const created = await givenAnamnesis();

      await http()
        .delete(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(204);
      await http()
        .get(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(404);
    });

    it('returns 409 once the order leaves received (AC-11)', async () => {
      const created = await givenAnamnesis();
      await http()
        .post(`/service-orders/${created.serviceOrderId}/diagnosis/start`)
        .expect(200);

      await http()
        .delete(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(409);
    });

    it('returns 404 when already deleted (AC-12)', async () => {
      const created = await givenAnamnesis();
      await http()
        .delete(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(204);

      await http()
        .delete(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(404);
    });
  });

  describe('diagnosis/start anamnesis prerequisite', () => {
    it('returns 409 when the anamnesis was deleted (AC-13)', async () => {
      const created = await givenAnamnesis();
      await http()
        .delete(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(204);

      await http()
        .post(`/service-orders/${created.serviceOrderId}/diagnosis/start`)
        .expect(409);
    });

    it('starts diagnosis when the anamnesis exists (AC-14)', async () => {
      const created = await givenAnamnesis();

      await http()
        .post(`/service-orders/${created.serviceOrderId}/diagnosis/start`)
        .expect(200);
      const order = await http()
        .get(`/service-orders/${created.serviceOrderId}`)
        .expect(200);
      expect((order.body as { status: string }).status).toBe('in_diagnosis');
    });
  });

  describe('cascade soft delete (AC-15)', () => {
    it('soft deletes the anamnesis when the OS is deleted', async () => {
      const created = await givenAnamnesis();

      await http().delete(`/service-orders/${created.serviceOrderId}`).expect(204);
      await http()
        .get(`/service-orders/${created.serviceOrderId}/anamnesis`)
        .expect(404);
    });
  });
});