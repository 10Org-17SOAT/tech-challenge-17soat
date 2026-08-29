import { ServiceOrder, ServiceOrderStatus } from './service-order.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface ListServiceOrdersFilter extends Pagination {
  status?: ServiceOrderStatus;
}

export interface PaginatedServiceOrders {
  items: ServiceOrder[];
  total: number;
}

export interface ServiceOrderRepository {
  findById(id: string): Promise<ServiceOrder | null>;
  findMany(filter: ListServiceOrdersFilter): Promise<PaginatedServiceOrders>;
  save(order: ServiceOrder): Promise<void>;
}

export const SERVICE_ORDER_REPOSITORY = Symbol('SERVICE_ORDER_REPOSITORY');
