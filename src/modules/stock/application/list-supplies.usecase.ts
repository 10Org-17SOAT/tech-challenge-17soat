import { Inject, Injectable } from '@nestjs/common';
import { STOCK_MOVEMENT_REPOSITORY } from '@/modules/stock/domain/stock-movement.repository';
import type { StockMovementRepository } from '@/modules/stock/domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '@/modules/stock/domain/supply.repository';
import type {
  ListSuppliesFilter,
  SupplyRepository,
} from '@/modules/stock/domain/supply.repository';
import type { SupplyWithBalance } from '@/modules/stock/application/supply-with-balance';

export interface ListSuppliesOutput {
  items: SupplyWithBalance[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListSuppliesUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async execute(filter: ListSuppliesFilter): Promise<ListSuppliesOutput> {
    const { items, total } = await this.supplyRepository.findMany(filter);

    // One aggregate query for the whole page — never one per row. Listing is a
    // pure read: it never raises PurchaseRequestNeeded, or a page of 20 empty
    // supplies would fire 20 events.
    const balances = await this.stockMovementRepository.getAvailableBalances(
      items.map((supply) => supply.id),
    );

    return {
      items: items.map((supply) => ({
        supply,
        availableBalance: balances.get(supply.id) ?? 0,
      })),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }
}
