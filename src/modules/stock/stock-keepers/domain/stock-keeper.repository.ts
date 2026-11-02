import { StockKeeper } from './stock-keeper.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface ListStockKeepersFilter extends Pagination {
  name?: string;
}

export interface PaginatedStockKeepers {
  items: StockKeeper[];
  total: number;
}

export interface StockKeeperRepository {
  findById(id: string): Promise<StockKeeper | null>;
  findByCpf(cpf: string): Promise<StockKeeper | null>;
  findMany(filter: ListStockKeepersFilter): Promise<PaginatedStockKeepers>;
  save(stockKeeper: StockKeeper): Promise<void>;
}

export const STOCK_KEEPER_REPOSITORY = Symbol('STOCK_KEEPER_REPOSITORY');
