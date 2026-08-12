/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Vehicle } from '../src/modules/vehicle-management/domain/entities/vehicle.entity';
import type { IVehicleRepository } from '../src/modules/vehicle-management/domain/repositories/vehicle.repository';
import {
  LicensePlate,
  VehicleId,
} from '../src/modules/vehicle-management/domain/value-objects';

const FIRST_ID = '11111111-1111-4111-8111-111111111111';
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
  let repository: InMemoryVehicleRepository;

  const payload = {
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
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('VEHICLE_REPOSITORY')
      .useValue(repository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('executa o fluxo completo de criação, consulta, atualização, listagem e exclusão', async () => {
    const created = await request(app.getHttpServer())
      .post('/vehicles')
      .send(payload)
      .expect(201);

    expect(created.body).toMatchObject({
      licensePlate: payload.licensePlate,
      model: payload.model,
      status: 'ACTIVE',
    });

    const id = created.body.id as string;

    await request(app.getHttpServer())
      .post('/vehicles')
      .send(payload)
      .expect(409);

    await request(app.getHttpServer())
      .get(`/vehicles/${id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(id);
        expect(body.deletedAt).toBeNull();
      });

    await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .patch(`/vehicles/${id}`)
      .send({ model: 'Fit', color: 'Azul', odometer: 20000 })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id,
          model: 'Fit',
          color: 'Azul',
          odometer: 20000,
        });
      });

    await request(app.getHttpServer())
      .patch(`/vehicles/${id}`)
      .send({ status: 'INVALID' })
      .expect(400);

    await request(app.getHttpServer()).delete(`/vehicles/${id}`).expect(204);
    await request(app.getHttpServer()).get(`/vehicles/${id}`).expect(404);
    repository.returnDeletedOnLookup = true;
    await request(app.getHttpServer()).delete(`/vehicles/${id}`).expect(404);
  });

  it('trata entradas inexistentes e paginação limitada', async () => {
    repository.seed(
      Vehicle.create({
        id: FIRST_ID,
        licensePlate: 'DEF-5678',
        model: 'Corolla',
        year: 2023,
        manufacturer: 'Toyota',
        color: 'Preto',
        fuelType: 'GASOLINE',
        odometer: 1000,
      }),
    );

    await request(app.getHttpServer())
      .get(`/vehicles/${MISSING_ID}`)
      .expect(404);

    await request(app.getHttpServer())
      .get('/vehicles')
      .query({ page: 0, limit: 999 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.pagination).toMatchObject({
          page: 1,
          limit: 100,
          total: 1,
        });
      });

    await request(app.getHttpServer())
      .patch(`/vehicles/${MISSING_ID}`)
      .send({ model: 'Yaris' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/vehicles/${MISSING_ID}`)
      .expect(404);
  });

  it('converte falhas de domínio e falhas inesperadas em respostas HTTP', async () => {
    await request(app.getHttpServer())
      .post('/vehicles')
      .send({ ...payload, licensePlate: '' })
      .expect(400);

    repository.error = new Error('database unavailable');
    await request(app.getHttpServer()).get('/vehicles').expect(500);
    await request(app.getHttpServer()).get(`/vehicles/${FIRST_ID}`).expect(500);
    await request(app.getHttpServer())
      .patch(`/vehicles/${FIRST_ID}`)
      .send({ model: 'Fit' })
      .expect(500);
    await request(app.getHttpServer())
      .delete(`/vehicles/${FIRST_ID}`)
      .expect(500);
  });
});
