import { Inject, Injectable } from '@nestjs/common';
import type { IVehicleRepository } from '../../../domain/repositories/vehicle.repository';
import { ListVehiclesInput, ListVehiclesOutput } from './list-vehicles.dto';

@Injectable()
export class ListVehiclesUseCase {
  constructor(
    @Inject('VEHICLE_REPOSITORY')
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  async execute(input: ListVehiclesInput): Promise<ListVehiclesOutput> {
    // Validate pagination parameters
    const page = Math.max(1, input.page);
    const limit = Math.max(1, Math.min(100, input.limit)); // Max 100 items per page

    const offset = (page - 1) * limit;

    // Fetch vehicles
    const vehicles = await this.vehicleRepository.findAll(limit, offset);
    const total = await this.vehicleRepository.findAllCount();

    // Convert to output
    const data = vehicles.map((vehicle) => {
      const primitives = vehicle.toPrimitives();
      return {
        id: primitives.id,
        licensePlate: primitives.licensePlate,
        model: primitives.model,
        year: primitives.year,
        manufacturer: primitives.manufacturer,
        description: primitives.description,
        color: primitives.color,
        fuelType: primitives.fuelType,
        odometer: primitives.odometer,
        status: primitives.status,
        createdAt: primitives.createdAt,
        updatedAt: primitives.updatedAt,
      };
    });

    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }
}
