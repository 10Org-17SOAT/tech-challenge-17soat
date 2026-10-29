import type {
  StockKeeperDirectoryQuery,
  StockKeeperView,
} from '../../stock-keepers/public/stock-keeper-directory.query';

export class InMemoryStockKeeperDirectoryQuery implements StockKeeperDirectoryQuery {
  private readonly stockKeepers = new Map<string, StockKeeperView>();

  add(stockKeeper: StockKeeperView): StockKeeperView {
    this.stockKeepers.set(stockKeeper.id, stockKeeper);
    return stockKeeper;
  }

  findById(id: string): Promise<StockKeeperView | null> {
    return Promise.resolve(this.stockKeepers.get(id) ?? null);
  }
}
