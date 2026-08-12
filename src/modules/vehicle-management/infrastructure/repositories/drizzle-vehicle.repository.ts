import { Inject, Injectable } from '@nestjs/common';
import { eq, count } from 'drizzle-orm';
import type { IVehicleRepository } from '../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleId, LicensePlate } from '../../domain/value-objects';
import { DATABASE_CONNECTION, type DrizzleDatabase } from '../../../../shared/config/database';
import { vehiclesTable } from '../persistence/vehicle.schema';
import { VehicleMapper } from '../mappers/vehicle.mapper';
import { VehicleException } from '../../domain/exceptions/vehicle.exceptions';

@Injectable()
export class DrizzleVehicleRepository implements IVehicleRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DrizzleDatabase,
  ) {}

  async save(vehicle: Vehicle): Promise<void> {
    const primitives = vehicle.toPrimitives();

    // Use direct query to avoid typed schema issues
    const existingVehicle = await (this.db as any).select().from(vehiclesTable).where(eq(vehiclesTable.id, primitives.id)).limit(1);

    if (existingVehicle && existingVehicle.length > 0) {
      // Update
      await (this.db as any)
        .update(vehiclesTable)
        .set({
          model: primitives.model,
          year: primitives.year,
          manufacturer: primitives.manufacturer,
          description: primitives.description,
          color: primitives.color,
          fuelType: primitives.fuelType,
          odometer: primitives.odometer,
          status: primitives.status,
          updatedAt: new Date(),
        })
        .where(eq(vehiclesTable.id, primitives.id));
    } else {
      // Insert
      await (this.db as any).insert(vehiclesTable).values({
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
      });
    }
  }

  async findById(id: VehicleId): Promise<Vehicle | null> {
    const rows = await (this.db as any)
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, id.getValue()))
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return VehicleMapper.toDomain({
      id: row.id,
      licensePlate: row.licensePlate,
      model: row.model,
      year: row.year,
      manufacturer: row.manufacturer,
      description: row.description,
      color: row.color,
      fuelType: row.fuelType,
      odometer: row.odometer,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  async findByLicensePlate(plate: LicensePlate): Promise<Vehicle | null> {
    const rows = await (this.db as any)
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.licensePlate, plate.getValue()))
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return VehicleMapper.toDomain({
      id: row.id,
      licensePlate: row.licensePlate,
      model: row.model,
      year: row.year,
      manufacturer: row.manufacturer,
      description: row.description,
      color: row.color,
      fuelType: row.fuelType,
      odometer: row.odometer,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  async findAll(limit: number, offset: number): Promise<Vehicle[]> {
    const rows = await (this.db as any)
      .select()
      .from(vehiclesTable)
      .limit(limit)
      .offset(offset);

    return rows.map((row: any) =>
      VehicleMapper.toDomain({
        id: row.id,
        licensePlate: row.licensePlate,
        model: row.model,
        year: row.year,
        manufacturer: row.manufacturer,
        description: row.description,
        color: row.color,
        fuelType: row.fuelType,
        odometer: row.odometer,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }),
    );
  }

  async findAllCount(): Promise<number> {
    const result = await (this.db as any)
      .select({ count: count() })
      .from(vehiclesTable);
    
    return result[0]?.count || 0;
  }

  async delete(vehicle: Vehicle): Promise<void> {
    const deletedAt = vehicle.getDeletedAt();

    if (!deletedAt) {
      throw new VehicleException(
        'Vehicle must be marked as deleted before persisting the deletion',
      );
    }

    await this.db
      .update(vehiclesTable)
      .set({
        deletedAt,
        status: vehicle.getStatus().getValue(),
        updatedAt: vehicle.getUpdatedAt(),
      })
      .where(eq(vehiclesTable.id, vehicle.getId().getValue()));
  }
}

