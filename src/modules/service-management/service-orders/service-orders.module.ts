import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { CreateServiceOrderUseCase } from './application/create-service-order.usecase';
import { DeleteServiceOrderUseCase } from './application/delete-service-order.usecase';
import { DiagnosisCompletedHandler } from './application/event-handlers/diagnosis-completed.handler';
import { DiagnosisStartedHandler } from './application/event-handlers/diagnosis-started.handler';
import { ExecutionCompletedHandler } from './application/event-handlers/execution-completed.handler';
import { ExecutionStartedHandler } from './application/event-handlers/execution-started.handler';
import { QuotationApprovedHandler } from './application/event-handlers/quotation-approved.handler';
import { GetServiceOrderStatusUseCase } from './application/get-service-order-status.usecase';
import { GetServiceOrderUseCase } from './application/get-service-order.usecase';
import { ListServiceOrdersUseCase } from './application/list-service-orders.usecase';
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
    GetServiceOrderStatusUseCase,
    ListServiceOrdersUseCase,
    UpdateServiceOrderUseCase,
    DeleteServiceOrderUseCase,
    DiagnosisStartedHandler,
    DiagnosisCompletedHandler,
    QuotationApprovedHandler,
    ExecutionStartedHandler,
    ExecutionCompletedHandler,
  ],
})
export class ServiceOrdersModule {}
