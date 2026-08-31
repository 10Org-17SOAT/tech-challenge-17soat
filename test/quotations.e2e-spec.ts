import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CLEANUP_TABLES, givenOwnedVehicle } from './fixtures';

describe('Quotations (e2e)', () => {
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
  const unique = () => Math.random().toString(36).slice(2, 10);

  interface QuotationItemResponse {
    kind: 'labor' | 'part';
    referenceId: string;
    name: string;
    unitPriceInCents: number;
    quantity: number;
    subtotalInCents: number;
  }

  interface QuotationResponse {
    id: string;
    serviceOrderId: string;
    status: string;
    items: QuotationItemResponse[];
    totalInCents: number;
    approvedAt: string | null;
  }

  async function givenSupply(priceInCents: number): Promise<string> {
    const res = await http()
      .post('/supplies')
      .send({ name: `Peca ${unique()}`, priceInCents })
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

  async function givenService(
    laborPriceInCents: number,
    supplies: { supplyId: string; quantity: number }[] = [],
  ): Promise<string> {
    const res = await http()
      .post('/services')
      .send({
        name: `Servico ${unique()}`,
        category: 'mechanical',
        laborPriceInCents,
      })
      .expect(201);
    const id = (res.body as { id: string }).id;

    if (supplies.length > 0) {
      await http()
        .put(`/services/${id}/supplies`)
        .send({ supplies })
        .expect(200);
    }
    return id;
  }

  async function givenOrderInDiagnosis(): Promise<string> {
    const res = await http()
      .post('/service-order/anamnesis')
      .send({
        vehicleId,
        consultantId: '22222222-2222-4222-8222-222222222222',
        mainComplaint: 'Barulho na suspensão',
        problemDescription: 'Estalo ao passar em lombadas',
      })
      .expect(201);
    const id = (res.body as { serviceOrderId: string }).serviceOrderId;
    await http().post(`/service-orders/${id}/diagnosis/start`).expect(200);
    return id;
  }

  async function completeDiagnosis(
    orderId: string,
    serviceItems: { serviceId: string; quantity: number }[],
  ): Promise<QuotationResponse> {
    const res = await http()
      .post(`/service-orders/${orderId}/diagnosis`)
      .send({ findings: 'Pastilhas de freio gastas', serviceItems })
      .expect(201);
    return (res.body as { quotation: QuotationResponse }).quotation;
  }

  describe('POST /service-orders/:id/diagnosis', () => {
    it('derives labour and parts from the services chosen', async () => {
      const oilId = await givenSupply(4500);
      const filterId = await givenSupply(3000);
      const serviceId = await givenService(9990, [
        { supplyId: oilId, quantity: 4 },
        { supplyId: filterId, quantity: 1 },
      ]);
      const orderId = await givenOrderInDiagnosis();

      const quotation = await completeDiagnosis(orderId, [
        { serviceId, quantity: 1 },
      ]);

      expect(quotation.totalInCents).toBe(9990 + 4500 * 4 + 3000);
      expect(quotation.items).toHaveLength(3);
      const oilLine = quotation.items.find((i) => i.referenceId === oilId)!;
      expect(oilLine.kind).toBe('part');
      expect(oilLine.quantity).toBe(4);
    });

    it('leaves the order awaiting approval with a quotation attached', async () => {
      const serviceId = await givenService(9990);
      const orderId = await givenOrderInDiagnosis();

      await completeDiagnosis(orderId, [{ serviceId, quantity: 1 }]);

      const order = await http().get(`/service-orders/${orderId}`).expect(200);
      expect((order.body as { status: string }).status).toBe(
        'awaiting_approval',
      );
      await http().get(`/service-orders/${orderId}/quotation`).expect(200);
    });

    it('refuses when a part in the bill of materials was deleted', async () => {
      const supplyId = await givenSupply(4500);
      const serviceId = await givenService(9990, [{ supplyId, quantity: 1 }]);
      await http().delete(`/supplies/${supplyId}`).expect(204);
      const orderId = await givenOrderInDiagnosis();

      await http()
        .post(`/service-orders/${orderId}/diagnosis`)
        .send({
          findings: 'Pastilhas gastas',
          serviceItems: [{ serviceId, quantity: 1 }],
        })
        .expect(422);

      const order = await http().get(`/service-orders/${orderId}`).expect(200);
      expect((order.body as { status: string }).status).toBe('in_diagnosis');
    });

    it('rejects a diagnosis on an order that is not in diagnosis', async () => {
      const serviceId = await givenService(9990);
      const created = await http()
        .post('/service-order/anamnesis')
        .send({
          vehicleId,
          consultantId: '22222222-2222-4222-8222-222222222222',
          mainComplaint: 'Barulho na suspensão',
          problemDescription: 'Estalo ao passar em lombadas',
        })
        .expect(201);

      await http()
        .post(
          `/service-orders/${(created.body as { serviceOrderId: string }).serviceOrderId}/diagnosis`,
        )
        .send({
          findings: 'Pastilhas gastas',
          serviceItems: [{ serviceId, quantity: 1 }],
        })
        .expect(409);
    });
  });

  describe('POST /quotations/:id/approve', () => {
    it('approves and advances the order to awaiting_execution', async () => {
      const serviceId = await givenService(9990);
      const orderId = await givenOrderInDiagnosis();
      const quotation = await completeDiagnosis(orderId, [
        { serviceId, quantity: 1 },
      ]);

      const approved = await http()
        .post(`/quotations/${quotation.id}/approve`)
        .expect(200);
      expect((approved.body as QuotationResponse).status).toBe('approved');
      expect((approved.body as QuotationResponse).approvedAt).not.toBeNull();

      const order = await http().get(`/service-orders/${orderId}`).expect(200);
      const body = order.body as {
        status: string;
        approvedByCustomer: boolean;
      };
      expect(body.status).toBe('awaiting_execution');
      expect(body.approvedByCustomer).toBe(true);
    });

    it('refuses a second approval', async () => {
      const serviceId = await givenService(9990);
      const orderId = await givenOrderInDiagnosis();
      const quotation = await completeDiagnosis(orderId, [
        { serviceId, quantity: 1 },
      ]);

      await http().post(`/quotations/${quotation.id}/approve`).expect(200);
      await http().post(`/quotations/${quotation.id}/approve`).expect(409);
    });

    it('returns 404 for an unknown quotation', async () => {
      await http()
        .post('/quotations/6f2c8e0a-0b0e-4f6e-9e1e-000000000000/approve')
        .expect(404);
    });
  });

  // The invariant the whole snapshot design exists for.
  describe('price freezing', () => {
    it('keeps the approved total after the catalogue changes', async () => {
      const supplyId = await givenSupply(4500);
      const serviceId = await givenService(9990, [{ supplyId, quantity: 1 }]);
      const orderId = await givenOrderInDiagnosis();
      const quotation = await completeDiagnosis(orderId, [
        { serviceId, quantity: 1 },
      ]);
      await http().post(`/quotations/${quotation.id}/approve`).expect(200);

      await http()
        .patch(`/services/${serviceId}`)
        .send({ laborPriceInCents: 50000 })
        .expect(200);
      await http()
        .patch(`/supplies/${supplyId}`)
        .send({ priceInCents: 99999 })
        .expect(200);

      const reread = await http()
        .get(`/quotations/${quotation.id}`)
        .expect(200);
      expect((reread.body as QuotationResponse).totalInCents).toBe(9990 + 4500);
    });
  });

  describe('GET /service-orders/:id/quotation', () => {
    it('returns 404 while no quotation has been issued', async () => {
      const orderId = await givenOrderInDiagnosis();
      await http().get(`/service-orders/${orderId}/quotation`).expect(404);
    });
  });
});
