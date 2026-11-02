import { Supply } from '../domain/supply.entity';
import type {
  ListSuppliesFilter,
  PaginatedSupplies,
  SupplyRepository,
} from '../domain/supply.repository';

export class InMemorySupplyRepository implements SupplyRepository {
  readonly supplies = new Map<string, Supply>();

  findById(id: string): Promise<Supply | null> {
    const supply = this.supplies.get(id);
    return Promise.resolve(supply && !supply.deletedAt ? supply : null);
  }

  findManyByIds(ids: string[]): Promise<Supply[]> {
    const wanted = new Set(ids);
    return Promise.resolve(
      [...this.supplies.values()].filter(
        (supply) => wanted.has(supply.id) && !supply.deletedAt,
      ),
    );
  }

  findByName(name: string): Promise<Supply | null> {
    for (const supply of this.supplies.values()) {
      if (supply.name === name && !supply.deletedAt) {
        return Promise.resolve(supply);
      }
    }
    return Promise.resolve(null);
  }

  findMany({
    page,
    limit,
    name,
  }: ListSuppliesFilter): Promise<PaginatedSupplies> {
    const term = name?.toLocaleLowerCase();
    const active = [...this.supplies.values()].filter(
      (s) =>
        !s.deletedAt &&
        (term === undefined || s.name.toLocaleLowerCase().includes(term)),
    );
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
