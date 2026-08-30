import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from './application/create-service.usecase';
import { DeleteServiceUseCase } from './application/delete-service.usecase';
import { GetServiceSuppliesUseCase } from './application/get-service-supplies.usecase';
import { ReplaceServiceSuppliesUseCase } from './application/replace-service-supplies.usecase';
import { GetServiceUseCase } from './application/get-service.usecase';
import { ListServicesUseCase } from './application/list-services.usecase';
import { UpdateServiceUseCase } from './application/update-service.usecase';
import { SERVICE_REPOSITORY } from './domain/service.repository';
import { DrizzleServiceRepository } from './infrastructure/persistence/drizzle-service.repository';
import { ServicesController } from './presentation/services.controller';
import { DatabaseModule } from '../../../shared/config/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ServicesController],
  providers: [
    { provide: SERVICE_REPOSITORY, useClass: DrizzleServiceRepository },
    CreateServiceUseCase,
    GetServiceUseCase,
    ListServicesUseCase,
    UpdateServiceUseCase,
    DeleteServiceUseCase,
    GetServiceSuppliesUseCase,
    ReplaceServiceSuppliesUseCase,
  ],
  // The service catalogue and its bills of materials are read by the
  // quotations module when pricing an order.
  exports: [SERVICE_REPOSITORY],
})
export class ServicesModule {}
