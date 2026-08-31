import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { VehicleManagementModule } from '../../onboarding/vehicles/vehicle-management.module';
import { VEHICLE_LOOKUP } from '../../../shared/domain/ports/vehicle-lookup';
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
import { ANAMNESIS_CASCADE_PORT } from './domain/ports/anamnesis-cascade.port';
import { ANAMNESIS_EXISTENCE_PORT } from './domain/ports/anamnesis-existence.port';
import { DrizzleAnamnesisCascadeAdapter } from './infrastructure/adapters/drizzle-anamnesis-cascade.adapter';
import { DrizzleAnamnesisExistenceAdapter } from './infrastructure/adapters/drizzle-anamnesis-existence.adapter';
import { DrizzleVehicleLookupAdapter } from './infrastructure/adapters/drizzle-vehicle-lookup.adapter';
import { DrizzleServiceOrderRepository } from './infrastructure/persistence/drizzle-service-order.repository';
import { ServiceOrdersController } from './presentation/service-orders.controller';

@Module({
  // VehicleManagementModule exports only VEHICLE_CATALOG_QUERY, used to reject
  // an order opened for a vehicle that does not exist.
  imports: [DatabaseModule, VehicleManagementModule],
  controllers: [ServiceOrdersController],
  providers: [
    {
      provide: SERVICE_ORDER_REPOSITORY,
      useClass: DrizzleServiceOrderRepository,
    },
    {
      provide: ANAMNESIS_EXISTENCE_PORT,
      useClass: DrizzleAnamnesisExistenceAdapter,
    },
    {
      provide: ANAMNESIS_CASCADE_PORT,
      useClass: DrizzleAnamnesisCascadeAdapter,
    },
    {
      provide: VEHICLE_LOOKUP,
      useClass: DrizzleVehicleLookupAdapter,
    },
    {
      provide: ANAMNESIS_EXISTENCE_PORT,
      useClass: DrizzleAnamnesisExistenceAdapter,
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
  ],
  // StartDiagnosisUseCase and the order repository are consumed by the
  // diagnostics and quotations modules — direct calls, same bounded context.
  // CreateServiceOrderUseCase is consumed by the anamnesis module, which opens
  // the service order as the entry point of the flow.
  exports: [
    SERVICE_ORDER_REPOSITORY,
    StartDiagnosisUseCase,
    CreateServiceOrderUseCase,
  ],
})
export class ServiceOrdersModule {}
