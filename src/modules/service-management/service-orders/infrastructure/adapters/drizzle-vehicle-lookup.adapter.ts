import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import type { VehicleLookup } from '../../../../../shared/domain/ports/vehicle-lookup';
import { vehiclesTable } from '../../../../onboarding/vehicles/infrastructure/persistence/vehicle.schema';

// Dedicated adapter for the VEHICLE_LOOKUP port: service-management reads
// vehicle identity directly from the vehicles table (already referenced by the
// service_orders FK) without depending on onboarding internals.
@Injectable()
export class DrizzleVehicleLookupAdapter implements VehicleLookup {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async exists(vehicleId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: vehiclesTable.vehicle_id })
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.vehicle_id, vehicleId),
          isNull(vehiclesTable.deletedAt),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}