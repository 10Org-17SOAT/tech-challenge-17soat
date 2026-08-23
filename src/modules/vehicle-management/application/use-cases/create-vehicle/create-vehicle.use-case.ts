import { Inject, Injectable } from '@nestjs/common';
import type { IVehicleRepository } from '../../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import { LicensePlate } from '../../../domain/value-objects';
import { DuplicateLicensePlateException } from '../../../domain/exceptions/vehicle.exceptions';
import { CreateVehicleInput, CreateVehicleOutput } from './create-vehicle.dto';

@Injectable()
export class CreateVehicleUseCase {
  constructor(
    @Inject('VEHICLE_REPOSITORY')
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  async execute(input: CreateVehicleInput): Promise<CreateVehicleOutput> {
    // Check if license plate already exists
    const licensePlate = new LicensePlate(input.licensePlate);
    const existingVehicle =
      await this.vehicleRepository.findByLicensePlate(licensePlate);

    if (existingVehicle) {
      throw new DuplicateLicensePlateException(licensePlate.getValue());
    }

    // Create vehicle entity
    const vehicle = Vehicle.create({
      licensePlate: input.licensePlate,
      model: input.model,
      year: input.year,
      manufacturer: input.manufacturer,
      description: input.description,
      color: input.color,
      fuelType: input.fuelType,
      odometer: input.odometer,
    });

    // Save vehicle
    await this.vehicleRepository.save(vehicle);

    // Return output
    const primitives = vehicle.toPrimitives();

    return {
      vehicle_id: primitives.vehicle_id,
      licensePlate: primitives.licensePlate,
      model: primitives.model,
      year: primitives.year,
      manufacturer: primitives.manufacturer,
      description: primitives.description,
      color: primitives.color,
      fuelType: primitives.fuelType,
      odometer: primitives.odometer,
    };
  }
}
