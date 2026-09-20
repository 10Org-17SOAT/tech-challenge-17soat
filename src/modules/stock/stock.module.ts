import { Module } from '@nestjs/common';
import { CreateStockKeeperUseCase } from './stock-keepers/application/create-stock-keeper.usecase';
import { CreateSupplyUseCase } from './inventory/application/create-supply.usecase';
import { DeleteStockKeeperUseCase } from './stock-keepers/application/delete-stock-keeper.usecase';
import { DeleteSupplyUseCase } from './inventory/application/delete-supply.usecase';
import { GetStockKeeperUseCase } from './stock-keepers/application/get-stock-keeper.usecase';
import { GetSupplyUseCase } from './inventory/application/get-supply.usecase';
import { ListStockKeepersUseCase } from './stock-keepers/application/list-stock-keepers.usecase';
import { ListSuppliesUseCase } from './inventory/application/list-supplies.usecase';
import { LookupStockUseCase } from './inventory/application/lookup-stock.usecase';
import { RegisterStockEntryUseCase } from './inventory/application/register-stock-entry.usecase';
import { ReservePartUseCase } from './inventory/application/reserve-part.usecase';
import { UpdateStockKeeperUseCase } from './stock-keepers/application/update-stock-keeper.usecase';
import { UpdateSupplyUseCase } from './inventory/application/update-supply.usecase';
import { WriteOffReservedPartUseCase } from './inventory/application/write-off-reserved-part.usecase';
import { STOCK_KEEPER_REPOSITORY } from './stock-keepers/domain/stock-keeper.repository';
import { STOCK_MOVEMENT_REPOSITORY } from './inventory/domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from './inventory/domain/supply.repository';
import { DrizzleStockKeeperRepository } from './stock-keepers/infrastructure/persistence/drizzle-stock-keeper.repository';
import { DrizzleStockMovementRepository } from './inventory/infrastructure/persistence/drizzle-stock-movement.repository';
import { DrizzleSupplyRepository } from './inventory/infrastructure/persistence/drizzle-supply.repository';
import { StockKeepersController } from './stock-keepers/presentation/stock-keepers.controller';
import { SuppliesController } from './inventory/presentation/supplies.controller';
import { STOCK_KEEPER_DIRECTORY_QUERY } from './stock-keepers/public/stock-keeper-directory.query';
import { StockKeeperDirectoryQueryImpl } from './stock-keepers/public/stock-keeper-directory.query.impl';
import { SUPPLY_CATALOG_QUERY } from './inventory/public/supply-catalog.query';
import { SupplyCatalogQueryImpl } from './inventory/public/supply-catalog.query.impl';

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
    {
      provide: STOCK_KEEPER_DIRECTORY_QUERY,
      useClass: StockKeeperDirectoryQueryImpl,
    },
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
