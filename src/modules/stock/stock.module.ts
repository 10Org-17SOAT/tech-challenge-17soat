import { Module } from '@nestjs/common';
import { CreateStockKeeperUseCase } from './application/create-stock-keeper.usecase';
import { CreateSupplyUseCase } from './application/create-supply.usecase';
import { DeleteStockKeeperUseCase } from './application/delete-stock-keeper.usecase';
import { DeleteSupplyUseCase } from './application/delete-supply.usecase';
import { GetStockKeeperUseCase } from './application/get-stock-keeper.usecase';
import { GetSupplyUseCase } from './application/get-supply.usecase';
import { ListStockKeepersUseCase } from './application/list-stock-keepers.usecase';
import { ListSuppliesUseCase } from './application/list-supplies.usecase';
import { LookupStockUseCase } from './application/lookup-stock.usecase';
import { RegisterStockEntryUseCase } from './application/register-stock-entry.usecase';
import { ReservePartUseCase } from './application/reserve-part.usecase';
import { UpdateStockKeeperUseCase } from './application/update-stock-keeper.usecase';
import { UpdateSupplyUseCase } from './application/update-supply.usecase';
import { WriteOffReservedPartUseCase } from './application/write-off-reserved-part.usecase';
import { STOCK_KEEPER_REPOSITORY } from './domain/stock-keeper.repository';
import { STOCK_MOVEMENT_REPOSITORY } from './domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from './domain/supply.repository';
import { DrizzleStockKeeperRepository } from './infrastructure/persistence/drizzle-stock-keeper.repository';
import { DrizzleStockMovementRepository } from './infrastructure/persistence/drizzle-stock-movement.repository';
import { DrizzleSupplyRepository } from './infrastructure/persistence/drizzle-supply.repository';
import { StockKeepersController } from './presentation/stock-keepers.controller';
import { SuppliesController } from './presentation/supplies.controller';
import { SUPPLY_CATALOG_QUERY } from './public/supply-catalog.query';
import { SupplyCatalogQueryImpl } from './public/supply-catalog.query.impl';

@Module({
  controllers: [SuppliesController, StockKeepersController],
  providers: [
    { provide: SUPPLY_REPOSITORY, useClass: DrizzleSupplyRepository },
    {
      provide: STOCK_MOVEMENT_REPOSITORY,
      useClass: DrizzleStockMovementRepository,
    },
    {
      provide: STOCK_KEEPER_REPOSITORY,
      useClass: DrizzleStockKeeperRepository,
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
    CreateStockKeeperUseCase,
    GetStockKeeperUseCase,
    ListStockKeepersUseCase,
    UpdateStockKeeperUseCase,
    DeleteStockKeeperUseCase,
  ],
  // The published contract, and nothing else. Other modules inject
  // SUPPLY_CATALOG_QUERY; the repositories and use cases stay private.
  exports: [SUPPLY_CATALOG_QUERY],
})
export class StockModule {}
