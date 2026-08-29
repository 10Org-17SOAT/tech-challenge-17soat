import { Module } from '@nestjs/common';
import { CreateSupplyUseCase } from '@/modules/stock/application/create-supply.usecase';
import { DeleteSupplyUseCase } from '@/modules/stock/application/delete-supply.usecase';
import { GetSupplyUseCase } from '@/modules/stock/application/get-supply.usecase';
import { ListSuppliesUseCase } from '@/modules/stock/application/list-supplies.usecase';
import { LookupStockUseCase } from '@/modules/stock/application/lookup-stock.usecase';
import { RegisterStockEntryUseCase } from '@/modules/stock/application/register-stock-entry.usecase';
import { ReservePartUseCase } from '@/modules/stock/application/reserve-part.usecase';
import { UpdateSupplyUseCase } from '@/modules/stock/application/update-supply.usecase';
import { WriteOffReservedPartUseCase } from '@/modules/stock/application/write-off-reserved-part.usecase';
import { DOMAIN_EVENT_PUBLISHER } from '@/modules/stock/domain/events/domain-event-publisher';
import { STOCK_MOVEMENT_REPOSITORY } from '@/modules/stock/domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '@/modules/stock/domain/supply.repository';
import { NoopDomainEventPublisher } from '@/modules/stock/infrastructure/events/noop-domain-event-publisher';
import { DrizzleStockMovementRepository } from '@/modules/stock/infrastructure/persistence/drizzle-stock-movement.repository';
import { DrizzleSupplyRepository } from '@/modules/stock/infrastructure/persistence/drizzle-supply.repository';
import { SuppliesController } from '@/modules/stock/presentation/supplies.controller';

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
    RegisterStockEntryUseCase,
    LookupStockUseCase,
    ReservePartUseCase,
    WriteOffReservedPartUseCase,
  ],
  exports: [],
})
export class StockModule {}
