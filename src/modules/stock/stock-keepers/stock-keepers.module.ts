import { Module } from '@nestjs/common';
import { CreateStockKeeperUseCase } from './application/create-stock-keeper.usecase';
import { DeleteStockKeeperUseCase } from './application/delete-stock-keeper.usecase';
import { GetStockKeeperUseCase } from './application/get-stock-keeper.usecase';
import { ListStockKeepersUseCase } from './application/list-stock-keepers.usecase';
import { UpdateStockKeeperUseCase } from './application/update-stock-keeper.usecase';
import { STOCK_KEEPER_REPOSITORY } from './domain/stock-keeper.repository';
import { DrizzleStockKeeperRepository } from './infrastructure/persistence/drizzle-stock-keeper.repository';
import { StockKeepersController } from './presentation/stock-keepers.controller';
import { STOCK_KEEPER_DIRECTORY_QUERY } from './public/stock-keeper-directory.query';
import { StockKeeperDirectoryQueryImpl } from './public/stock-keeper-directory.query.impl';

/**
 * The employees who operate the stock context, as a profile of their own —
 * mirroring how `customers` is its own table in onboarding.
 *
 * Provisional by design: stock keepers, mechanics and consultants are all
 * becoming plain users in a later refactor, and this module is meant to be
 * absorbed by it. Depend on STOCK_KEEPER_DIRECTORY_QUERY and nothing else, so
 * that day is a provider swap.
 */
@Module({
  controllers: [StockKeepersController],
  providers: [
    {
      provide: STOCK_KEEPER_REPOSITORY,
      useClass: DrizzleStockKeeperRepository,
    },
    CreateStockKeeperUseCase,
    GetStockKeeperUseCase,
    ListStockKeepersUseCase,
    UpdateStockKeeperUseCase,
    DeleteStockKeeperUseCase,
    {
      provide: STOCK_KEEPER_DIRECTORY_QUERY,
      useClass: StockKeeperDirectoryQueryImpl,
    },
  ],
  exports: [STOCK_KEEPER_DIRECTORY_QUERY],
})
export class StockKeepersModule {}
