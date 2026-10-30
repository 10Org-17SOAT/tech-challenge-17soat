import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { ConsultantModule } from '../../onboarding/consultant/consultant.module';
import { CustomerModule } from '../../onboarding/customer/customer.module';
import { VehicleManagementModule } from '../../onboarding/vehicles/vehicle-management.module';
import { InventoryModule } from '../../stock/inventory/inventory.module';
import { ServicesModule } from '../services/services.module';
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
import { DrizzleServiceOrderRepository } from './infrastructure/persistence/drizzle-service-order.repository';
import { ServiceOrdersController } from './presentation/service-orders.controller';

@Module({
  // VehicleManagementModule exports VEHICLE_CATALOG_QUERY, used to reject an
  // order opened for a vehicle that does not exist. ConsultantModule exports
  // only CONSULTANT_DIRECTORY_QUERY, used the same way to resolve and
  // validate the consultant opening the order. ServicesModule and InventoryModule
  // check the requested services and parts against the catalogue and stock.
  imports: [
    DatabaseModule,
    VehicleManagementModule,
    ConsultantModule,
    // For CUSTOMER_CONTACT_QUERY: resolving which customer is behind the
    // requesting account is how order ownership is proved.
    CustomerModule,
    ServicesModule,
    InventoryModule,
  ],
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
  // diagnostics, quotations and anamnesis modules — direct calls, same
  // bounded context.
  exports: [SERVICE_ORDER_REPOSITORY, StartDiagnosisUseCase],
})
export class ServiceOrdersModule {}
