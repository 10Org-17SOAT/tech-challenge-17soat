import { Inject, Injectable } from '@nestjs/common';
import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { StockKeeper } from '../domain/stock-keeper.entity';
import { STOCK_KEEPER_REPOSITORY } from '../domain/stock-keeper.repository';
import type { StockKeeperRepository } from '../domain/stock-keeper.repository';

export interface UpdateStockKeeperInput {
  name?: string;
  phone?: string;
}

@Injectable()
export class UpdateStockKeeperUseCase {
  constructor(
    @Inject(STOCK_KEEPER_REPOSITORY)
    private readonly stockKeeperRepository: StockKeeperRepository,
  ) {}

  async execute(
    id: string,
    input: UpdateStockKeeperInput,
  ): Promise<StockKeeper> {
    const stockKeeper = await this.stockKeeperRepository.findById(id);
    if (!stockKeeper) {
      throw new StockKeeperNotFoundError(id);
    }

    // CPF is immutable, same as customer document and mechanic CPF: it is
    // the identity of the person, never updated through this endpoint.
    stockKeeper.update(input);
    await this.stockKeeperRepository.save(stockKeeper);

    return stockKeeper;
  }
}
