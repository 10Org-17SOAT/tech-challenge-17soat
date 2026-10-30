import { InMemoryConsultantDirectoryQuery } from '../../../onboarding/consultant/__test__/in-memory-consultant-directory.query';
import { InMemoryVehicleCatalogQuery } from '../../../onboarding/vehicles/__test__/in-memory-vehicle-catalog.query';
import type {
  SupplyCatalogQuery,
  SupplyView,
} from '../../../stock/inventory/public/supply-catalog.query';
import { InMemoryServiceRepository } from '../../services/__test__/in-memory-service.repository';
import { Service } from '../../services/domain/service.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { ConsultantNotFoundForServiceOrderError } from '../domain/errors/consultant-not-found-for-service-order.error';
import { InvalidServiceOrderError } from '../domain/errors/invalid-service-order.error';
import { PartsNotFoundForServiceOrderError } from '../domain/errors/parts-not-found-for-service-order.error';
import { ServicesNotFoundForServiceOrderError } from '../domain/errors/services-not-found-for-service-order.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import {
  CreateServiceOrderUseCase,
  type CreateServiceOrderInput,
} from './create-service-order.usecase';

const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';
const OWNER_ID = '8b0f5d6e-2a1c-4f3e-9d7b-1c2e3f4a5b6c';
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const SUPPLY_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f70';
const UNKNOWN_ID = 'f0000000-0000-4000-8000-000000000000';

class FakeSupplyCatalog implements SupplyCatalogQuery {
  readonly supplies = new Map<string, SupplyView>();

  findManyByIds(ids: string[]): Promise<Map<string, SupplyView>> {
    return Promise.resolve(
      new Map(
        ids
          .filter((id) => this.supplies.has(id))
          .map((id) => [id, this.supplies.get(id)!]),
      ),
    );
  }
}

describe('CreateServiceOrderUseCase', () => {
  let orders: InMemoryServiceOrderRepository;
  let consultants: InMemoryConsultantDirectoryQuery;
  let vehicles: InMemoryVehicleCatalogQuery;
  let services: InMemoryServiceRepository;
  let supplies: FakeSupplyCatalog;
  let useCase: CreateServiceOrderUseCase;
  let serviceId: string;

  beforeEach(async () => {
    orders = new InMemoryServiceOrderRepository();
    consultants = new InMemoryConsultantDirectoryQuery();
    consultants.add({ id: OPENED_BY_ID, name: OPENED_BY_NAME });
    vehicles = new InMemoryVehicleCatalogQuery();
    vehicles.add({
      id: VEHICLE_ID,
      ownerId: OWNER_ID,
      manufacturer: 'Fiat',
      model: 'Uno',
      year: 2018,
      licensePlate: 'ABC-1234',
    });
    services = new InMemoryServiceRepository();
    const service = Service.create({
      name: 'Alinhamento',
      category: 'mechanical',
      laborPriceInCents: 10000,
    });
    await services.save(service);
    serviceId = service.id;
    supplies = new FakeSupplyCatalog();
    supplies.supplies.set(SUPPLY_ID, {
      id: SUPPLY_ID,
      name: 'Óleo 5W30',
      priceInCents: 4500,
    });

    useCase = new CreateServiceOrderUseCase(
      orders,
      consultants,
      vehicles,
      services,
      supplies,
    );
  });

  const input = (
    overrides: Partial<CreateServiceOrderInput> = {},
  ): CreateServiceOrderInput => ({
    vehicleId: VEHICLE_ID,
    openedById: OPENED_BY_ID,
    services: [{ serviceId, quantity: 1 }],
    parts: [{ supplyId: SUPPLY_ID, quantity: 4 }],
    ...overrides,
  });

  const expectNothingWritten = async () => {
    const { total } = await orders.findMany({ page: 1, limit: 10 });
    expect(total).toBe(0);
    expect(orders.requestedItems.size).toBe(0);
  };

  it('opens the order in received with the requested items', async () => {
    const { order, requestedItems } = await useCase.execute(
      input({ notes: 'barulho', vehicleMileageAtEntry: 45000 }),
    );

    expect(order.status).toBe('received');
    expect(order.vehicleId).toBe(VEHICLE_ID);
    expect(order.openedById).toBe(OPENED_BY_ID);
    expect(order.openedByName).toBe(OPENED_BY_NAME);
    expect(order.notes).toBe('barulho');
    expect(order.vehicleMileageAtEntry).toBe(45000);
    await expect(orders.findById(order.id)).resolves.toBe(order);

    const saved = await orders.findRequestedItems(order.id);
    expect(saved).toEqual(requestedItems);
    expect(saved.services.map((s) => [s.serviceId, s.quantity])).toEqual([
      [serviceId, 1],
    ]);
    expect(saved.parts.map((p) => [p.supplyId, p.quantity])).toEqual([
      [SUPPLY_ID, 4],
    ]);
  });

  it('accepts an order with nothing requested yet', async () => {
    const { order, requestedItems } = await useCase.execute(
      input({ services: [], parts: [] }),
    );
    expect(order.status).toBe('received');
    expect(requestedItems).toEqual({ services: [], parts: [] });
  });

  // Every rejection below must leave nothing behind: no order and no
  // requested items.
  describe('rejections', () => {
    it('refuses a consultant that is not registered', async () => {
      await expect(
        useCase.execute(input({ openedById: UNKNOWN_ID })),
      ).rejects.toThrow(ConsultantNotFoundForServiceOrderError);
      await expectNothingWritten();
    });

    it('refuses a vehicle that is not registered', async () => {
      await expect(
        useCase.execute(input({ vehicleId: UNKNOWN_ID })),
      ).rejects.toThrow(VehicleNotFoundForServiceOrderError);
      await expectNothingWritten();
    });

    it('refuses services that are not in the catalogue, naming them', async () => {
      const result = useCase.execute(
        input({
          services: [
            { serviceId, quantity: 1 },
            { serviceId: UNKNOWN_ID, quantity: 1 },
          ],
        }),
      );
      await expect(result).rejects.toThrow(
        ServicesNotFoundForServiceOrderError,
      );
      await expect(result).rejects.toMatchObject({ serviceIds: [UNKNOWN_ID] });
      await expectNothingWritten();
    });

    it('refuses parts that are not in stock, naming them', async () => {
      const result = useCase.execute(
        input({
          parts: [{ supplyId: UNKNOWN_ID, quantity: 1 }],
        }),
      );
      await expect(result).rejects.toThrow(PartsNotFoundForServiceOrderError);
      await expect(result).rejects.toMatchObject({ supplyIds: [UNKNOWN_ID] });
      await expectNothingWritten();
    });

    it('refuses a non-positive quantity', async () => {
      await expect(
        useCase.execute(
          input({
            parts: [{ supplyId: SUPPLY_ID, quantity: 0 }],
          }),
        ),
      ).rejects.toThrow(InvalidServiceOrderError);
      await expectNothingWritten();
    });

    it('refuses invalid order fields after resolving everything else', async () => {
      await expect(
        useCase.execute(input({ vehicleMileageAtEntry: -1 })),
      ).rejects.toThrow(InvalidServiceOrderError);
      await expectNothingWritten();
    });
  });
});
