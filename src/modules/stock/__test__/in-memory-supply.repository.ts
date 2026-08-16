import { Supply } from '../domain/supply.entity';
import {
  PaginatedSupplies,
  Pagination,
  SupplyRepository,
} from '../domain/supply.repository';

export class InMemorySupplyRepository implements SupplyRepository {
  readonly supplies = new Map<string, Supply>();

  findById(id: string): Promise<Supply | null> {
    const supply = this.supplies.get(id);
    return Promise.resolve(supply && !supply.deletedAt ? supply : null);
  }

  findByName(name: string): Promise<Supply | null> {
    for (const supply of this.supplies.values()) {
      if (supply.name === name && !supply.deletedAt) {
        return Promise.resolve(supply);
      }
    }
    return Promise.resolve(null);
  }

  findMany({ page, limit }: Pagination): Promise<PaginatedSupplies> {
    const active = [...this.supplies.values()].filter((s) => !s.deletedAt);
    return Promise.resolve({
      items: active.slice((page - 1) * limit, page * limit),
      total: active.length,
    });
  }

  save(supply: Supply): Promise<void> {
    this.supplies.set(supply.id, supply);
    return Promise.resolve();
  }
}
