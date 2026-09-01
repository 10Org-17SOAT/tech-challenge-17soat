import { InMemoryConsultantDirectoryQuery } from '../../../onboarding/consultant/__test__/in-memory-consultant-directory.query';
import type { VehicleLookup } from '../../../../shared/domain/ports/vehicle-lookup';
import { ConsultantNotFoundForServiceOrderError } from '../domain/errors/consultant-not-found-for-service-order.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { CreateServiceOrderUseCase } from './create-service-order.usecase';

const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

describe('CreateServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let vehicleLookup: VehicleLookup;
  let consultants: InMemoryConsultantDirectoryQuery;
  let useCase: CreateServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    vehicleLookup = { exists: jest.fn().mockResolvedValue(true) };
    consultants = new InMemoryConsultantDirectoryQuery();
    consultants.add({ id: OPENED_BY_ID, name: OPENED_BY_NAME });
    useCase = new CreateServiceOrderUseCase(repository, vehicleLookup, consultants);
  });

  it('creates an order in status received and persists it', async () => {
    const order = await useCase.execute({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      notes: 'batida no farol',
      vehicleMileageAtEntry: 45000,
    });

    expect(order.status).toBe('received');
    expect(order.approvedByCustomer).toBe(false);
    expect(order.vehicleId).toBe(VEHICLE_ID);
    expect(order.openedById).toBe(OPENED_BY_ID);
    expect(order.openedByName).toBe(OPENED_BY_NAME);
    await expect(repository.findById(order.id)).resolves.toBe(order);
  });

  it('accepts a payload with no optional fields', async () => {
    const order = await useCase.execute({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
    });
    expect(order.vehicleId).toBe(VEHICLE_ID);
    expect(order.notes).toBeNull();
    expect(order.vehicleMileageAtEntry).toBeNull();
    expect(order.scheduledAt).toBeNull();
  });

  // Checked before the insert so the caller sees a 404 rather than a foreign
  // key violation surfacing as a 500.
  it('refuses an order for a vehicle that is not registered', async () => {
    (vehicleLookup.exists as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        vehicleId: 'f0000000-0000-4000-8000-000000000000',
        openedById: OPENED_BY_ID,
      }),
    ).rejects.toThrow(VehicleNotFoundForServiceOrderError);
  });

  it('does not persist anything when the vehicle is unknown', async () => {
    (vehicleLookup.exists as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        vehicleId: 'f0000000-0000-4000-8000-000000000000',
        openedById: OPENED_BY_ID,
      }),
    ).rejects.toThrow();

    const { total } = await repository.findMany({ page: 1, limit: 10 });
    expect(total).toBe(0);
  });

  it('checks that the vehicle exists before creating the order', async () => {
    await useCase.execute({ vehicleId: VEHICLE_ID, openedById: OPENED_BY_ID });

    expect(vehicleLookup.exists).toHaveBeenCalledWith(VEHICLE_ID);
  });

  // Same reasoning as the vehicle check: the name in the snapshot must come
  // from the directory, never be trusted from the caller, so an unknown
  // consultant id must reject before anything is persisted.
  it('refuses an order opened by a consultant that is not registered', async () => {
    await expect(
      useCase.execute({
        vehicleId: VEHICLE_ID,
        openedById: 'e0000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toThrow(ConsultantNotFoundForServiceOrderError);

    const { total } = await repository.findMany({ page: 1, limit: 10 });
    expect(total).toBe(0);
  });
});
