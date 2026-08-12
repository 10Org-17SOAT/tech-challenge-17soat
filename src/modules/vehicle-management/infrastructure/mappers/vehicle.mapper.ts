import { Injectable } from '@nestjs/common';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleResponseDto } from '../../application/dtos/vehicle-response.dto';

export interface VehiclePersistenceDTO {
  id: string;
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description: string | null;
  color: string;
  fuelType: string;
  odometer: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class VehicleMapper {
  static toPersistence(
    vehicle: Vehicle,
  ): Omit<VehiclePersistenceDTO, 'createdAt' | 'updatedAt'> {
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
      deletedAt: primitives.deletedAt,
    };
  }

  static toDomain(raw: VehiclePersistenceDTO): Vehicle {
    return new Vehicle({
      id: raw.id,
      licensePlate: raw.licensePlate,
      model: raw.model,
      year: raw.year,
      manufacturer: raw.manufacturer,
      description: raw.description || undefined,
      color: raw.color,
      fuelType: raw.fuelType,
      odometer: raw.odometer,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  static toResponse(vehicle: Vehicle): VehicleResponseDto {
    const primitives = vehicle.toPrimitives();
    return new VehicleResponseDto({
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
      deletedAt: primitives.deletedAt,
    });
  }
}
