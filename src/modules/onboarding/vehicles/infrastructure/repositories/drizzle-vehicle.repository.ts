import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import type { IVehicleRepository } from '../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleId, LicensePlate } from '../../domain/value-objects';
import {
  DATABASE_CONNECTION,
  type DrizzleDatabase,
} from '../../../../../shared/config/database';
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
    const existingVehicle = await this.db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.vehicle_id, primitives.vehicle_id))
      .limit(1);

    if (existingVehicle && existingVehicle.length > 0) {
      // Update
      await this.db
        .update(vehiclesTable)
        .set({
          model: primitives.model,
          year: primitives.year,
          manufacturer: primitives.manufacturer,
          description: primitives.description,
          color: primitives.color,
          fuelType: primitives.fuelType,
          odometer: primitives.odometer,
          updatedAt: new Date(),
        })
        .where(eq(vehiclesTable.vehicle_id, primitives.vehicle_id));
    } else {
      // Insert
      await this.db.insert(vehiclesTable).values({
        vehicle_id: primitives.vehicle_id,
        customerId: primitives.customerId,
        licensePlate: primitives.licensePlate,
        model: primitives.model,
        year: primitives.year,
        manufacturer: primitives.manufacturer,
        description: primitives.description,
        color: primitives.color,
        fuelType: primitives.fuelType,
        odometer: primitives.odometer,
      });
    }
  }

  async findById(id: VehicleId): Promise<Vehicle | null> {
    const rows = await this.db
      .select()
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.vehicle_id, id.getValue()),
          isNull(vehiclesTable.deletedAt),
        ),
      )
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return VehicleMapper.toDomain(row);
  }

  async findByLicensePlate(plate: LicensePlate): Promise<Vehicle | null> {
    const rows = await this.db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.licensePlate, plate.getValue()))
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return VehicleMapper.toDomain(row);
  }

  async findAll(limit: number, offset: number): Promise<Vehicle[]> {
    const rows = await this.db
      .select()
      .from(vehiclesTable)
      .where(isNull(vehiclesTable.deletedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => VehicleMapper.toDomain(row));
  }

  async findAllCount(): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(vehiclesTable)
      .where(isNull(vehiclesTable.deletedAt));

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
        updatedAt: vehicle.getUpdatedAt(),
      })
      .where(eq(vehiclesTable.vehicle_id, vehicle.getId().getValue()));
  }
}
