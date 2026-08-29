import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from '@/modules/service-order/services/application/create-service.usecase';
import { DeleteServiceUseCase } from '@/modules/service-order/services/application/delete-service.usecase';
import { GetServiceUseCase } from '@/modules/service-order/services/application/get-service.usecase';
import { ListServicesUseCase } from '@/modules/service-order/services/application/list-services.usecase';
import { UpdateServiceUseCase } from '@/modules/service-order/services/application/update-service.usecase';
import { SERVICE_REPOSITORY } from '@/modules/service-order/services/domain/service.repository';
import { DrizzleServiceRepository } from '@/modules/service-order/services/infrastructure/persistence/drizzle-service.repository';
import { ServicesController } from '@/modules/service-order/services/presentation/services.controller';
import { DatabaseModule } from '@/shared/config/database/database.module';

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
  ],
})
export class ServicesModule {}
