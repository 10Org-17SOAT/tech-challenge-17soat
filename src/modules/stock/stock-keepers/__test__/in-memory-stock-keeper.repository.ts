import { StockKeeper } from '../domain/stock-keeper.entity';
import type {
  ListStockKeepersFilter,
  PaginatedStockKeepers,
  StockKeeperRepository,
} from '../domain/stock-keeper.repository';

export class InMemoryStockKeeperRepository implements StockKeeperRepository {
  readonly stockKeepers = new Map<string, StockKeeper>();

  findById(id: string): Promise<StockKeeper | null> {
    const stockKeeper = this.stockKeepers.get(id);
    return Promise.resolve(
      stockKeeper && !stockKeeper.deletedAt ? stockKeeper : null,
    );
  }

  findByCpf(cpf: string): Promise<StockKeeper | null> {
    for (const stockKeeper of this.stockKeepers.values()) {
      if (stockKeeper.cpf === cpf && !stockKeeper.deletedAt) {
        return Promise.resolve(stockKeeper);
      }
    }
    return Promise.resolve(null);
  }

  findMany({
    page,
    limit,
    name,
  }: ListStockKeepersFilter): Promise<PaginatedStockKeepers> {
    const term = name?.toLocaleLowerCase();
    const active = [...this.stockKeepers.values()].filter(
      (s) =>
        !s.deletedAt &&
        (term === undefined || s.name.toLocaleLowerCase().includes(term)),
    );
    return Promise.resolve({
      items: active.slice((page - 1) * limit, page * limit),
      total: active.length,
    });
  }

  save(stockKeeper: StockKeeper): Promise<void> {
    this.stockKeepers.set(stockKeeper.id, stockKeeper);
    return Promise.resolve();
  }
}
