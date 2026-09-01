/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { httpAs, tokenFor } from './fixtures';
import { UserRole } from '../src/modules/auth/roles/role.enum';
import { InMemoryCustomerContactQuery } from '../src/modules/onboarding/customer/__test__/in-memory-customer-contact.query';
import { CUSTOMER_CONTACT_QUERY } from '../src/modules/onboarding/customer/public/customer-contact.query';
import { Vehicle } from '../src/modules/onboarding/vehicles/domain/entities/vehicle.entity';
import type { IVehicleRepository } from '../src/modules/onboarding/vehicles/domain/repositories/vehicle.repository';
import {
  LicensePlate,
  VehicleId,
} from '../src/modules/onboarding/vehicles/domain/value-objects';

const FIRST_ID = '11111111-1111-4111-8111-111111111111';
const CUSTOMER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const MISSING_ID = '22222222-2222-4222-8222-222222222222';

class InMemoryVehicleRepository implements IVehicleRepository {
  private readonly vehicles = new Map<string, Vehicle>();
  error: Error | null = null;
  returnDeletedOnLookup = false;

  async save(vehicle: Vehicle): Promise<void> {
    this.throwIfConfigured();
    await Promise.resolve();
    this.vehicles.set(vehicle.getId().getValue(), vehicle);
  }

  async findById(id: VehicleId): Promise<Vehicle | null> {
    this.throwIfConfigured();
    await Promise.resolve();
    const vehicle = this.vehicles.get(id.getValue());
    return vehicle && (this.returnDeletedOnLookup || !vehicle.isDeleted())
      ? vehicle
      : null;
  }

  async findByLicensePlate(plate: LicensePlate): Promise<Vehicle | null> {
    this.throwIfConfigured();
    await Promise.resolve();
    return (
      [...this.vehicles.values()].find(
        (vehicle) =>
          vehicle.getLicensePlate().getValue() === plate.getValue() &&
          !vehicle.isDeleted(),
      ) ?? null
    );
  }

  async findAll(limit: number, offset: number): Promise<Vehicle[]> {
    this.throwIfConfigured();
    await Promise.resolve();
    return [...this.vehicles.values()]
      .filter((vehicle) => !vehicle.isDeleted())
      .slice(offset, offset + limit);
  }

  async findAllCount(): Promise<number> {
    this.throwIfConfigured();
    await Promise.resolve();
    return [...this.vehicles.values()].filter((vehicle) => !vehicle.isDeleted())
      .length;
  }

  async delete(vehicle: Vehicle): Promise<void> {
    this.throwIfConfigured();
    await Promise.resolve();
    this.vehicles.set(vehicle.getId().getValue(), vehicle);
  }

  seed(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.getId().getValue(), vehicle);
  }

  private throwIfConfigured(): void {
    if (this.error) {
      throw this.error;
    }
  }
}

describe('Vehicle Management (integração HTTP)', () => {
  let app: INestApplication<App>;
  let token: string;

  const http = () => httpAs(app, token);
  let repository: InMemoryVehicleRepository;

  const payload = {
    customerId: CUSTOMER_ID,
    licensePlate: 'ABC-1234',
    model: 'Civic',
    year: 2024,
    manufacturer: 'Honda',
    description: 'Veículo de teste',
    color: 'Prata',
    fuelType: 'HYBRID',
    odometer: 15000,
  };

  beforeEach(async () => {
    repository = new InMemoryVehicleRepository();
    // The owner lookup is stubbed alongside the repository: this suite runs the
    // vehicle module without touching Postgres, and creating a vehicle now
    // checks that its customer exists.
    const customers = new InMemoryCustomerContactQuery();
    customers.add({
      id: CUSTOMER_ID,
      name: 'Ana Souza',
      email: 'ana@example.com',
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('VEHICLE_REPOSITORY')
      .useValue(repository)
      .overrideProvider(CUSTOMER_CONTACT_QUERY)
      .useValue(customers)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = tokenFor(app, UserRole.ADMIN);
  });

  afterEach(async () => {
    await app.close();
  });

  it('executes the complete workflow of creating, querying, updating, listing, and deleting.', async () => {
    const created = await http().post('/vehicles').send(payload).expect(201);

    expect(created.body).toMatchObject({
      licensePlate: payload.licensePlate,
      model: payload.model,
    });

    const id = created.body.vehicle_id as string;

    await http().post('/vehicles').send(payload).expect(409);

    await http()
      .get(`/vehicles/${id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.vehicle_id).toBe(id);
        expect(body.deletedAt).toBeNull();
      });

    await http()
      .get('/vehicles')
      .query({ page: 1, limit: 10 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        });
      });

    await http()
      .patch(`/vehicles/${id}`)
      .send({ model: 'Fit', color: 'Azul', odometer: 20000 })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          vehicle_id: id,
          model: 'Fit',
          color: 'Azul',
          odometer: 20000,
        });
      });

    await http().delete(`/vehicles/${id}`).expect(204);
    await http().get(`/vehicles/${id}`).expect(404);
    repository.returnDeletedOnLookup = true;
    await http().delete(`/vehicles/${id}`).expect(404);
  });

  it('trata entradas inexistentes e paginação limitada', async () => {
    repository.seed(
      Vehicle.create({
        customerId: CUSTOMER_ID,
        vehicle_id: FIRST_ID,
        licensePlate: 'DEF-5678',
        model: 'Corolla',
        year: 2023,
        manufacturer: 'Toyota',
        color: 'Preto',
        fuelType: 'GASOLINE',
        odometer: 1000,
      }),
    );

    await http().get(`/vehicles/${MISSING_ID}`).expect(404);

    // Fail-fast: out-of-range pagination is rejected by the Zod schema
    // instead of being silently clamped.
    await http().get('/vehicles').query({ page: 0, limit: 999 }).expect(400);

    await http()
      .get('/vehicles')
      .expect(200)
      .expect(({ body }) => {
        expect(body.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: 1,
        });
      });

    await http()
      .patch(`/vehicles/${MISSING_ID}`)
      .send({ model: 'Yaris' })
      .expect(404);

    await http().delete(`/vehicles/${MISSING_ID}`).expect(404);
  });

  // A vehicle belongs to a customer, and the owner is checked before the
  // insert so an unknown one is a 404 rather than a foreign key violation
  // surfacing as a 500.
  it('recusa um veículo cujo dono não existe', async () => {
    await http()
      .post('/vehicles')
      .send({ ...payload, customerId: MISSING_ID })
      .expect(404);
  });

  it('converte falhas de domínio e falhas inesperadas em respostas HTTP', async () => {
    const invalid = await http()
      .post('/vehicles')
      .send({ ...payload, licensePlate: '' });
    expect(invalid.status).toBe(400);

    repository.error = new Error('database unavailable');
    const failed = await http().get('/vehicles');
    expect(failed.status).toBe(500);
    await http().get(`/vehicles/${FIRST_ID}`).expect(500);
    await http()
      .patch(`/vehicles/${FIRST_ID}`)
      .send({ model: 'Fit' })
      .expect(500);
    await http().delete(`/vehicles/${FIRST_ID}`).expect(500);
  });
});
