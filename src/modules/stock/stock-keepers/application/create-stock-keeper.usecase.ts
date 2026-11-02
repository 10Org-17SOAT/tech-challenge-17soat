import { Inject, Injectable } from '@nestjs/common';
import { StockKeeperCpfAlreadyExistsError } from '../domain/errors/stock-keeper-cpf-already-exists.error';
import { StockKeeper } from '../domain/stock-keeper.entity';
import { STOCK_KEEPER_REPOSITORY } from '../domain/stock-keeper.repository';
import type { StockKeeperRepository } from '../domain/stock-keeper.repository';

export interface CreateStockKeeperInput {
  userId: string;
  name: string;
  cpf: string;
  phone: string;
}

@Injectable()
export class CreateStockKeeperUseCase {
  constructor(
    @Inject(STOCK_KEEPER_REPOSITORY)
    private readonly stockKeeperRepository: StockKeeperRepository,
  ) {}

  async execute(input: CreateStockKeeperInput): Promise<StockKeeper> {
    const stockKeeper = StockKeeper.create(input);

    const existing = await this.stockKeeperRepository.findByCpf(
      stockKeeper.cpf,
    );
    if (existing) {
      throw new StockKeeperCpfAlreadyExistsError(stockKeeper.cpf);
    }

    await this.stockKeeperRepository.save(stockKeeper);
    return stockKeeper;
  }
}
