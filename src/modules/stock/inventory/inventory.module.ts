import { Module } from '@nestjs/common';
import { StockKeepersModule } from '../stock-keepers/stock-keepers.module';
import { CreateSupplyUseCase } from './application/create-supply.usecase';
import { DeleteSupplyUseCase } from './application/delete-supply.usecase';
import { GetSupplyUseCase } from './application/get-supply.usecase';
import { ListSuppliesUseCase } from './application/list-supplies.usecase';
import { LookupStockUseCase } from './application/lookup-stock.usecase';
import { RegisterStockEntryUseCase } from './application/register-stock-entry.usecase';
import { ReservePartUseCase } from './application/reserve-part.usecase';
import { UpdateSupplyUseCase } from './application/update-supply.usecase';
import { WriteOffReservedPartUseCase } from './application/write-off-reserved-part.usecase';
import { STOCK_MOVEMENT_REPOSITORY } from './domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from './domain/supply.repository';
import { DrizzleStockMovementRepository } from './infrastructure/persistence/drizzle-stock-movement.repository';
import { DrizzleSupplyRepository } from './infrastructure/persistence/drizzle-supply.repository';
import { SuppliesController } from './presentation/supplies.controller';
import { SUPPLY_CATALOG_QUERY } from './public/supply-catalog.query';
import { SupplyCatalogQueryImpl } from './public/supply-catalog.query.impl';

/**
 * The supply catalog and its ledger. They live together because they read each
 * other's state in both directions: a movement is only accepted for a supply
 * that exists, and a supply is never read without the balance derived from its
 * movements. Quantity is not a column on `supplies` — it is always a sum over
 * `stock_movements`.
 */
@Module({
  // Only for STOCK_KEEPER_DIRECTORY_QUERY, which RegisterStockEntry uses to
  // snapshot who performed an entry. Nothing else here touches that module.
  imports: [StockKeepersModule],
  controllers: [SuppliesController],
  providers: [
    { provide: SUPPLY_REPOSITORY, useClass: DrizzleSupplyRepository },
    {
      provide: STOCK_MOVEMENT_REPOSITORY,
      useClass: DrizzleStockMovementRepository,
    },
    CreateSupplyUseCase,
    GetSupplyUseCase,
    ListSuppliesUseCase,
    UpdateSupplyUseCase,
    DeleteSupplyUseCase,
    RegisterStockEntryUseCase,
    LookupStockUseCase,
    ReservePartUseCase,
    WriteOffReservedPartUseCase,
    { provide: SUPPLY_CATALOG_QUERY, useClass: SupplyCatalogQueryImpl },
  ],
  // The published contract, and nothing else. Other modules inject
  // SUPPLY_CATALOG_QUERY; the repositories and use cases stay private.
  exports: [SUPPLY_CATALOG_QUERY],
})
export class InventoryModule {}
