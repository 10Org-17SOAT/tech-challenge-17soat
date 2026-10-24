import { Inject, Injectable } from '@nestjs/common';
import { Vehicle } from '../domain/entities/vehicle.entity';
import { VehicleException } from '../domain/exceptions/vehicle.exceptions';
import type { IVehicleRepository } from '../domain/repositories/vehicle.repository';
import {
  LicensePlateTakenError,
  VehicleRegistrationRejectedError,
  type NewVehicle,
  type PendingVehicleRegistration,
  type VehicleRegistration,
} from './vehicle-registration';

@Injectable()
export class DomainVehicleRegistration implements VehicleRegistration {
  constructor(
    @Inject('VEHICLE_REPOSITORY')
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  async prepare(input: NewVehicle): Promise<PendingVehicleRegistration> {
    const vehicle = this.build(input);

    // Removed vehicles come back too: the plate column is unique regardless
    // of soft delete, so a removed plate cannot be registered again either.
    const existing = await this.vehicleRepository.findByLicensePlate(
      vehicle.getLicensePlate(),
    );
    if (existing) {
      if (
        existing.getDeletedAt() !== null ||
        existing.getCustomerId() !== input.ownerId
      ) {
        throw new LicensePlateTakenError(vehicle.getLicensePlate().getValue());
      }
      return {
        vehicleId: existing.getId().getValue(),
        isNew: false,
        commit: () => Promise.resolve(),
      };
    }

    return {
      vehicleId: vehicle.getId().getValue(),
      isNew: true,
      commit: () => this.vehicleRepository.save(vehicle),
    };
  }

  private build(input: NewVehicle): Vehicle {
    try {
      return Vehicle.create({
        customerId: input.ownerId,
        licensePlate: input.licensePlate,
        model: input.model,
        year: input.year,
        manufacturer: input.manufacturer,
        description: input.description,
        color: input.color,
        fuelType: input.fuelType,
        odometer: input.odometer,
      });
    } catch (error) {
      if (error instanceof VehicleException) {
        throw new VehicleRegistrationRejectedError(error.message, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
