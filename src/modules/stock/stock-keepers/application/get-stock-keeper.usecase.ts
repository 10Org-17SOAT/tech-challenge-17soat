import { Inject, Injectable } from '@nestjs/common';
import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { StockKeeper } from '../domain/stock-keeper.entity';
import { STOCK_KEEPER_REPOSITORY } from '../domain/stock-keeper.repository';
import type { StockKeeperRepository } from '../domain/stock-keeper.repository';

@Injectable()
export class GetStockKeeperUseCase {
  constructor(
    @Inject(STOCK_KEEPER_REPOSITORY)
    private readonly stockKeeperRepository: StockKeeperRepository,
  ) {}

  async execute(id: string): Promise<StockKeeper> {
    const stockKeeper = await this.stockKeeperRepository.findById(id);
    if (!stockKeeper) {
      throw new StockKeeperNotFoundError(id);
    }
    return stockKeeper;
  }
}
