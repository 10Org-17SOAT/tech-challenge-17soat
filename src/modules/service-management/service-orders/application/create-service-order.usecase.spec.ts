import { InMemoryVehicleCatalogQuery } from '../../../onboarding/vehicles/__test__/in-memory-vehicle-catalog.query';
import type { VehicleLookup } from '../../../../shared/domain/ports/vehicle-lookup';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { VehicleNotFoundError } from '../domain/errors/vehicle-not-found.error';
import { CreateServiceOrderUseCase } from './create-service-order.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';

describe('CreateServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let vehicles: InMemoryVehicleCatalogQuery;
  let vehicleLookup: VehicleLookup;
  let useCase: CreateServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    vehicles = new InMemoryVehicleCatalogQuery();
    vehicles.add({
      id: vehicleId,
      ownerId: '3f6a1b20-1c2d-4e3f-8a9b-0c1d2e3f4a5b',
      manufacturer: 'Fiat',
      model: 'Uno',
      year: 2018,
      licensePlate: 'ABC-1234',
    });
    vehicleLookup = { exists: jest.fn().mockResolvedValue(true) };
    useCase = new CreateServiceOrderUseCase(repository, vehicleLookup);
  });

  it('creates an order in status received and persists it', async () => {
    const order = await useCase.execute({
      vehicleId,
      notes: 'batida no farol',
      vehicleMileageAtEntry: 45000,
    });

    expect(order.status).toBe('received');
    expect(order.approvedByCustomer).toBe(false);
    expect(order.vehicleId).toBe(vehicleId);
    await expect(repository.findById(order.id)).resolves.toBe(order);
  });

  it('accepts a payload with no optional fields', async () => {
    const order = await useCase.execute({ vehicleId });
    expect(order.vehicleId).toBe(vehicleId);
    expect(order.notes).toBeNull();
    expect(order.vehicleMileageAtEntry).toBeNull();
    expect(order.scheduledAt).toBeNull();
  });

  // Checked before the insert so the caller sees a 404 rather than a foreign
  // key violation surfacing as a 500.
  it('refuses an order for a vehicle that is not registered', async () => {
    await expect(
      useCase.execute({ vehicleId: 'f0000000-0000-4000-8000-000000000000' }),
    ).rejects.toThrow(VehicleNotFoundForServiceOrderError);
  });

  it('does not persist anything when the vehicle is unknown', async () => {
    await expect(
      useCase.execute({ vehicleId: 'f0000000-0000-4000-8000-000000000000' }),
    ).rejects.toThrow();

    const { total } = await repository.findMany({ page: 1, limit: 10 });
    expect(total).toBe(0);
  });

  it('checks that the vehicle exists before creating the order', async () => {
    await useCase.execute({ vehicleId });

    expect(vehicleLookup.exists).toHaveBeenCalledWith(vehicleId);
  });

  it('rejects an unknown vehicle with VehicleNotFoundError', async () => {
    (vehicleLookup.exists as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute({ vehicleId })).rejects.toThrow(
      VehicleNotFoundError,
    );
  });
});
