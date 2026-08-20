import { Module } from '@nestjs/common';
import { CreateSupplyUseCase } from './application/create-supply.usecase';
import { DeleteSupplyUseCase } from './application/delete-supply.usecase';
import { GetSupplyUseCase } from './application/get-supply.usecase';
import { ListSuppliesUseCase } from './application/list-supplies.usecase';
import { UpdateSupplyUseCase } from './application/update-supply.usecase';
import { DOMAIN_EVENT_PUBLISHER } from './domain/events/domain-event-publisher';
import { STOCK_MOVEMENT_REPOSITORY } from './domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from './domain/supply.repository';
import { NoopDomainEventPublisher } from './infrastructure/events/noop-domain-event-publisher';
import { DrizzleStockMovementRepository } from './infrastructure/persistence/drizzle-stock-movement.repository';
import { DrizzleSupplyRepository } from './infrastructure/persistence/drizzle-supply.repository';
import { SuppliesController } from './presentation/supplies.controller';

@Module({
  controllers: [SuppliesController],
  providers: [
    { provide: SUPPLY_REPOSITORY, useClass: DrizzleSupplyRepository },
    {
      provide: STOCK_MOVEMENT_REPOSITORY,
      useClass: DrizzleStockMovementRepository,
    },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: NoopDomainEventPublisher },
    CreateSupplyUseCase,
    GetSupplyUseCase,
    ListSuppliesUseCase,
    UpdateSupplyUseCase,
    DeleteSupplyUseCase,
  ],
  exports: [],
})
export class StockModule {}
