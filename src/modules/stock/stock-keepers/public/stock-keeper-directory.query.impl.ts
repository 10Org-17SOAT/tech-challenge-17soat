import { Inject, Injectable } from '@nestjs/common';
import { STOCK_KEEPER_REPOSITORY } from '../domain/stock-keeper.repository';
import type { StockKeeperRepository } from '../domain/stock-keeper.repository';
import type {
  StockKeeperDirectoryQuery,
  StockKeeperView,
} from './stock-keeper-directory.query';

@Injectable()
export class StockKeeperDirectoryQueryImpl implements StockKeeperDirectoryQuery {
  constructor(
    @Inject(STOCK_KEEPER_REPOSITORY)
    private readonly stockKeeperRepository: StockKeeperRepository,
  ) {}

  async findById(id: string): Promise<StockKeeperView | null> {
    const stockKeeper = await this.stockKeeperRepository.findById(id);
    return stockKeeper ? { id: stockKeeper.id, name: stockKeeper.name } : null;
  }
}
