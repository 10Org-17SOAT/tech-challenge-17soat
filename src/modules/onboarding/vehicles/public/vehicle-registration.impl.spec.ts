import { Vehicle } from '../domain/entities/vehicle.entity';
import type { IVehicleRepository } from '../domain/repositories/vehicle.repository';
import {
  LicensePlateTakenError,
  VehicleRegistrationRejectedError,
  type NewVehicle,
} from './vehicle-registration';
import { DomainVehicleRegistration } from './vehicle-registration.impl';

const OWNER_ID = '8b0f5d6e-2a1c-4f3e-9d7b-1c2e3f4a5b6c';

const newVehicle: NewVehicle = {
  ownerId: OWNER_ID,
  licensePlate: 'ABC1D23',
  model: 'Uno',
  year: 2018,
  manufacturer: 'Fiat',
  color: 'Prata',
  fuelType: 'GASOLINE',
  odometer: 45000,
};

describe('DomainVehicleRegistration', () => {
  let repository: jest.Mocked<
    Pick<IVehicleRepository, 'findByLicensePlate' | 'save'>
  >;
  let registration: DomainVehicleRegistration;

  beforeEach(() => {
    repository = {
      findByLicensePlate: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    registration = new DomainVehicleRegistration(
      repository as unknown as IVehicleRepository,
    );
  });

  const existing = (overrides: Partial<Parameters<typeof Vehicle.create>[0]>) =>
    Vehicle.create({ ...newVehicle, customerId: OWNER_ID, ...overrides });

  it('writes nothing until commit', async () => {
    const pending = await registration.prepare(newVehicle);

    expect(pending.isNew).toBe(true);
    expect(repository.save).not.toHaveBeenCalled();

    await pending.commit();
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('reuses a plate already registered to the same owner', async () => {
    const vehicle = existing({});
    repository.findByLicensePlate.mockResolvedValue(vehicle);

    const pending = await registration.prepare(newVehicle);
    await pending.commit();

    expect(pending.isNew).toBe(false);
    expect(pending.vehicleId).toBe(vehicle.getId().getValue());
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a plate registered to another owner', async () => {
    repository.findByLicensePlate.mockResolvedValue(
      existing({ customerId: 'f0000000-0000-4000-8000-000000000000' }),
    );

    await expect(registration.prepare(newVehicle)).rejects.toThrow(
      LicensePlateTakenError,
    );
  });

  it('rejects a plate whose vehicle was removed', async () => {
    repository.findByLicensePlate.mockResolvedValue(
      existing({ deletedAt: new Date() }),
    );

    await expect(registration.prepare(newVehicle)).rejects.toThrow(
      LicensePlateTakenError,
    );
  });

  it('rejects invalid data with the published error', async () => {
    await expect(
      registration.prepare({ ...newVehicle, fuelType: 'STEAM' }),
    ).rejects.toThrow(VehicleRegistrationRejectedError);
  });
});
