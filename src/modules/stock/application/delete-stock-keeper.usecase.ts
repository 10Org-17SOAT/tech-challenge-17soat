import { Inject, Injectable } from '@nestjs/common';
import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { STOCK_KEEPER_REPOSITORY } from '../domain/stock-keeper.repository';
import type { StockKeeperRepository } from '../domain/stock-keeper.repository';

@Injectable()
export class DeleteStockKeeperUseCase {
  constructor(
    @Inject(STOCK_KEEPER_REPOSITORY)
    private readonly stockKeeperRepository: StockKeeperRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const stockKeeper = await this.stockKeeperRepository.findById(id);
    if (!stockKeeper) {
      throw new StockKeeperNotFoundError(id);
    }

    // No allocation/availability rule for stock keepers (unlike mechanics):
    // deletion is unconditional soft delete.
    stockKeeper.delete();
    await this.stockKeeperRepository.save(stockKeeper);
  }
}
