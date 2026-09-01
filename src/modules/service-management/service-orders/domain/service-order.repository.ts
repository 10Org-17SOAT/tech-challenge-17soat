import { ServiceItem } from './service-item';
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

// The window is anchored on `completedAt`, not on when the order was opened
// or started: a period, once closed, keeps answering the same number forever.
export interface ExecutionTimeFilter {
  from?: Date;
  to?: Date;
}

export interface ExecutionTimeStats {
  // Null when no finished order falls in the window. "No data" is not zero
  // minutes, and a chart drawn from a zero would read as excellent.
  averageMinutes: number | null;
  sampleSize: number;
}

export interface ServiceOrderRepository {
  findById(id: string): Promise<ServiceOrder | null>;
  findMany(filter: ListServiceOrdersFilter): Promise<PaginatedServiceOrders>;
  save(order: ServiceOrder): Promise<void>;
  // The order's scope of work. Kept off `findMany` on purpose: a paginated
  // list has no use for every order's items.
  findItems(serviceOrderId: string): Promise<ServiceItem[]>;
  replaceItems(serviceOrderId: string, items: ServiceItem[]): Promise<void>;
  // Bench time only: the stretch between `in_execution` and `finished`. The
  // wait for diagnosis and for the customer's approval is deliberately out.
  averageExecutionTime(
    filter: ExecutionTimeFilter,
  ): Promise<ExecutionTimeStats>;
}

export const SERVICE_ORDER_REPOSITORY = Symbol('SERVICE_ORDER_REPOSITORY');
