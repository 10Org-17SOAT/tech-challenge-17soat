import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type DrizzleDatabase,
} from '../../../../shared/config/database';
import { vehiclesTable } from '../infrastructure/persistence/vehicle.schema';
import type { VehicleCatalogQuery, VehicleView } from './vehicle-catalog.query';

/** A projection over `vehicles` — deliberately not the `Vehicle` aggregate. */
@Injectable()
export class DrizzleVehicleCatalogQuery implements VehicleCatalogQuery {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<VehicleView | null> {
    const rows = await this.db
      .select({
        id: vehiclesTable.vehicle_id,
        ownerId: vehiclesTable.customerId,
        manufacturer: vehiclesTable.manufacturer,
        model: vehiclesTable.model,
        year: vehiclesTable.year,
        licensePlate: vehiclesTable.licensePlate,
      })
      .from(vehiclesTable)
      .where(
        and(eq(vehiclesTable.vehicle_id, id), isNull(vehiclesTable.deletedAt)),
      )
      .limit(1);

    return rows[0] ?? null;
  }
}
