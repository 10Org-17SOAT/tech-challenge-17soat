import { Order, OrderStatus } from './order.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface ListOrdersFilter extends Pagination {
  status?: OrderStatus;
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
}

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findMany(filter: ListOrdersFilter): Promise<PaginatedOrders>;
  save(order: Order): Promise<void>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
