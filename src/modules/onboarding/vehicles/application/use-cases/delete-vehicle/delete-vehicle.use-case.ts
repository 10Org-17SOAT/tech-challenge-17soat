import { Inject, Injectable } from '@nestjs/common';
import type { IVehicleRepository } from '@/modules/onboarding/vehicles/domain/repositories/vehicle.repository';
import { VehicleId } from '@/modules/onboarding/vehicles/domain/value-objects';
import { VehicleNotFoundException } from '@/modules/onboarding/vehicles/domain/exceptions/vehicle.exceptions';

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

    if (vehicle.isDeleted()) {
      throw new VehicleNotFoundException(id);
    }

    vehicle.delete();
    // Save updated vehicle
    await this.vehicleRepository.delete(vehicle);
  }
}
