import { Inject, Injectable } from '@nestjs/common';
import type { IVehicleRepository } from '../../../domain/repositories/vehicle.repository';
import { VehicleId } from '../../../domain/value-objects';
import { VehicleNotFoundException } from '../../../domain/exceptions/vehicle.exceptions';

@Injectable()
export class DeleteVehicleUseCase {
  constructor(
    @Inject('VEHICLE_REPOSITORY')
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  async execute(id: string): Promise<void> {
    // Fetch vehicle
    const vehicleId = new VehicleId(id);
    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new VehicleNotFoundException(id);
    }

    // Soft delete: mark as INACTIVE
    vehicle.deactivate();

    // Save updated vehicle
    await this.vehicleRepository.save(vehicle);
  }
}
