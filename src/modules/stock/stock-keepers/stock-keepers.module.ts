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
 * The stock keeper profile. A stock keeper is not an identity of its own: it
 * is a row in auth's `users` with the STOCK_KEEPER role, and this module owns
 * only the profile on top of it (CPF, phone) and the routes that manage it —
 * the same shape mechanic and consultant have.
 *
 * Inventory depends on STOCK_KEEPER_DIRECTORY_QUERY and nothing else, so how
 * the profile is stored stays this module's business.
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
