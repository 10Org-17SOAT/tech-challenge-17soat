import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { VehicleController } from './presentation/controllers/vehicle.controller';
import { CreateVehicleUseCase } from './application/use-cases/create-vehicle/create-vehicle.use-case';
import { FindVehicleByIdUseCase } from './application/use-cases/find-vehicle-by-id/find-vehicle-by-id.use-case';
import { ListVehiclesUseCase } from './application/use-cases/list-vehicles/list-vehicles.use-case';
import { UpdateVehicleUseCase } from './application/use-cases/update-vehicle/update-vehicle.use-case';
import { DeleteVehicleUseCase } from './application/use-cases/delete-vehicle/delete-vehicle.use-case';
import { DrizzleVehicleRepository } from './infrastructure/repositories/drizzle-vehicle.repository';
import { VehicleMapper } from './infrastructure/mappers/vehicle.mapper';
import { CustomerModule } from '../customer/customer.module';
import { VEHICLE_CATALOG_QUERY } from './public/vehicle-catalog.query';
import { DrizzleVehicleCatalogQuery } from './public/vehicle-catalog.query.impl';

@Module({
  // CustomerModule exports only CUSTOMER_CONTACT_QUERY, used here to reject a
  // vehicle whose owner does not exist.
  imports: [DatabaseModule, CustomerModule],
  controllers: [VehicleController],
  providers: [
    // Use Cases
    CreateVehicleUseCase,
    FindVehicleByIdUseCase,
    ListVehiclesUseCase,
    UpdateVehicleUseCase,
    DeleteVehicleUseCase,
    // Mappers
    VehicleMapper,
    // Repository with token
    {
      provide: 'VEHICLE_REPOSITORY',
      useClass: DrizzleVehicleRepository,
    },
    {
      provide: VEHICLE_CATALOG_QUERY,
      useClass: DrizzleVehicleCatalogQuery,
    },
  ],
  exports: [
    VEHICLE_CATALOG_QUERY,
    'VEHICLE_REPOSITORY',
    CreateVehicleUseCase,
    FindVehicleByIdUseCase,
    ListVehiclesUseCase,
    UpdateVehicleUseCase,
    DeleteVehicleUseCase,
  ],
})
export class VehicleManagementModule {}
