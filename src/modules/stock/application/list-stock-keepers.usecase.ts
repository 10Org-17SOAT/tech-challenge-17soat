import { Inject, Injectable } from '@nestjs/common';
import { STOCK_KEEPER_REPOSITORY } from '../domain/stock-keeper.repository';
import type {
  ListStockKeepersFilter,
  StockKeeperRepository,
} from '../domain/stock-keeper.repository';
import { StockKeeper } from '../domain/stock-keeper.entity';

export interface ListStockKeepersOutput {
  items: StockKeeper[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListStockKeepersUseCase {
  constructor(
    @Inject(STOCK_KEEPER_REPOSITORY)
    private readonly stockKeeperRepository: StockKeeperRepository,
  ) {}

  async execute(
    filter: ListStockKeepersFilter,
  ): Promise<ListStockKeepersOutput> {
    const { items, total } = await this.stockKeeperRepository.findMany(
      filter,
    );

    return { items, total, page: filter.page, limit: filter.limit };
  }
}
