import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { CreateServiceOrderUseCase } from './application/create-service-order.usecase';
import { DeleteServiceOrderUseCase } from './application/delete-service-order.usecase';
import { GetServiceOrderUseCase } from './application/get-service-order.usecase';
import { ListServiceOrdersUseCase } from './application/list-service-orders.usecase';
import { UpdateServiceOrderStatusUseCase } from './application/update-service-order-status.usecase';
import { UpdateServiceOrderUseCase } from './application/update-service-order.usecase';
import { SERVICE_ORDER_REPOSITORY } from './domain/service-order.repository';
import { DrizzleServiceOrderRepository } from './infrastructure/persistence/drizzle-service-order.repository';
import { ServiceOrdersController } from './presentation/service-orders.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceOrdersController],
  providers: [
    { provide: SERVICE_ORDER_REPOSITORY, useClass: DrizzleServiceOrderRepository },
    CreateServiceOrderUseCase,
    GetServiceOrderUseCase,
    ListServiceOrdersUseCase,
    UpdateServiceOrderUseCase,
    UpdateServiceOrderStatusUseCase,
    DeleteServiceOrderUseCase,
  ],
})
export class ServiceOrdersModule {}
