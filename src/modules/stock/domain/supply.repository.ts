import { Supply } from './supply.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedSupplies {
  items: Supply[];
  total: number;
}

export interface SupplyRepository {
  findById(id: string): Promise<Supply | null>;
  findByName(name: string): Promise<Supply | null>;
  findMany(pagination: Pagination): Promise<PaginatedSupplies>;
  save(supply: Supply): Promise<void>;
}

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');
