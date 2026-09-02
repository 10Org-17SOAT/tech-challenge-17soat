import { Supply } from './supply.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface ListSuppliesFilter extends Pagination {
  name?: string;
}

export interface PaginatedSupplies {
  items: Supply[];
  total: number;
}

export interface SupplyRepository {
  findById(id: string): Promise<Supply | null>;
  findManyByIds(ids: string[]): Promise<Supply[]>;
  findByName(name: string): Promise<Supply | null>;
  findMany(filter: ListSuppliesFilter): Promise<PaginatedSupplies>;
  save(supply: Supply): Promise<void>;
}

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');
