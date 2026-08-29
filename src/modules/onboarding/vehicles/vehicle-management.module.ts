import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/shared/config/database/database.module';
import { VehicleController } from '@/modules/onboarding/vehicles/presentation/controllers/vehicle.controller';
import { CreateVehicleUseCase } from '@/modules/onboarding/vehicles/application/use-cases/create-vehicle/create-vehicle.use-case';
import { FindVehicleByIdUseCase } from '@/modules/onboarding/vehicles/application/use-cases/find-vehicle-by-id/find-vehicle-by-id.use-case';
import { ListVehiclesUseCase } from '@/modules/onboarding/vehicles/application/use-cases/list-vehicles/list-vehicles.use-case';
import { UpdateVehicleUseCase } from '@/modules/onboarding/vehicles/application/use-cases/update-vehicle/update-vehicle.use-case';
import { DeleteVehicleUseCase } from '@/modules/onboarding/vehicles/application/use-cases/delete-vehicle/delete-vehicle.use-case';
import { DrizzleVehicleRepository } from '@/modules/onboarding/vehicles/infrastructure/repositories/drizzle-vehicle.repository';
import { VehicleMapper } from '@/modules/onboarding/vehicles/infrastructure/mappers/vehicle.mapper';

@Module({
  imports: [DatabaseModule],
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
  ],
  exports: [
    'VEHICLE_REPOSITORY',
    CreateVehicleUseCase,
    FindVehicleByIdUseCase,
    ListVehiclesUseCase,
    UpdateVehicleUseCase,
    DeleteVehicleUseCase,
  ],
})
export class VehicleManagementModule {}
