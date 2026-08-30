import { Module } from '@nestjs/common';
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

@Module({
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
export class StockModule {}
