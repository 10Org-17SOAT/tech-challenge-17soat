import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { ConsultantModule } from '../../onboarding/consultant/consultant.module';
import { VehicleManagementModule } from '../../onboarding/vehicles/vehicle-management.module';
import { CreateServiceOrderUseCase } from './application/create-service-order.usecase';
import { DeleteServiceOrderUseCase } from './application/delete-service-order.usecase';
import { ExecutionCompletedHandler } from './application/event-handlers/execution-completed.handler';
import { ExecutionStartedHandler } from './application/event-handlers/execution-started.handler';
import { PaymentReceivedHandler } from './application/event-handlers/payment-received.handler';
import { GetAverageExecutionTimeUseCase } from './application/get-average-execution-time.usecase';
import { GetServiceOrderStatusUseCase } from './application/get-service-order-status.usecase';
import { GetServiceOrderUseCase } from './application/get-service-order.usecase';
import { ListServiceOrdersUseCase } from './application/list-service-orders.usecase';
import { StartDiagnosisUseCase } from './application/start-diagnosis.usecase';
import { UpdateServiceOrderUseCase } from './application/update-service-order.usecase';
import { SERVICE_ORDER_REPOSITORY } from './domain/service-order.repository';
import { DrizzleServiceOrderRepository } from './infrastructure/persistence/drizzle-service-order.repository';
import { ServiceOrdersController } from './presentation/service-orders.controller';

@Module({
  // VehicleManagementModule exports only VEHICLE_CATALOG_QUERY, used to reject
  // an order opened for a vehicle that does not exist. ConsultantModule
  // exports only CONSULTANT_DIRECTORY_QUERY, used the same way to resolve
  // and validate the consultant opening the order.
  imports: [DatabaseModule, VehicleManagementModule, ConsultantModule],
  controllers: [ServiceOrdersController],
  providers: [
    {
      provide: SERVICE_ORDER_REPOSITORY,
      useClass: DrizzleServiceOrderRepository,
    },
    CreateServiceOrderUseCase,
    GetServiceOrderUseCase,
    GetServiceOrderStatusUseCase,
    ListServiceOrdersUseCase,
    UpdateServiceOrderUseCase,
    DeleteServiceOrderUseCase,
    GetAverageExecutionTimeUseCase,
    StartDiagnosisUseCase,
    ExecutionStartedHandler,
    ExecutionCompletedHandler,
    PaymentReceivedHandler,
  ],
  // StartDiagnosisUseCase and the order repository are consumed by the
  // diagnostics and quotations modules — direct calls, same bounded context.
  exports: [SERVICE_ORDER_REPOSITORY, StartDiagnosisUseCase],
})
export class ServiceOrdersModule {}
