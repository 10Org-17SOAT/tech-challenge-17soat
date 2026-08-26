import { Inject, Injectable } from '@nestjs/common';
import type { IVehicleRepository } from '../../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import { VehicleId } from '../../../domain/value-objects';
import { VehicleNotFoundException } from '../../../domain/exceptions/vehicle.exceptions';

@Injectable()
export class FindVehicleByIdUseCase {
  constructor(
    @Inject('VEHICLE_REPOSITORY')
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  async execute(id: string): Promise<Vehicle | null> {
    const vehicleId = new VehicleId(id);
    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new VehicleNotFoundException(id);
    }

    return vehicle;
  }
}
