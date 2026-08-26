import { Inject, Injectable } from '@nestjs/common';
import type { IVehicleRepository } from '../../../domain/repositories/vehicle.repository';
import { VehicleId } from '../../../domain/value-objects';
import { VehicleNotFoundException } from '../../../domain/exceptions/vehicle.exceptions';
import { UpdateVehicleInput, UpdateVehicleOutput } from './update-vehicle.dto';

@Injectable()
export class UpdateVehicleUseCase {
  constructor(
    @Inject('VEHICLE_REPOSITORY')
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  async execute(input: UpdateVehicleInput): Promise<UpdateVehicleOutput> {
    // Fetch vehicle
    const vehicleId = new VehicleId(input.vehicle_id);
    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new VehicleNotFoundException(input.vehicle_id);
    }

    // Update vehicle info
    vehicle.updateVehicleInfo({
      model: input.model,
      year: input.year,
      manufacturer: input.manufacturer,
      description: input.description,
      color: input.color,
      fuelType: input.fuelType,
      odometer: input.odometer,
    });

    // Save updated vehicle
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
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
