import { ServiceOrder } from '../domain/service-order.entity';
import {
  ListServiceOrdersFilter,
  ServiceOrderRepository,
  PaginatedServiceOrders,
} from '../domain/service-order.repository';

export class InMemoryServiceOrderRepository implements ServiceOrderRepository {
  readonly orders = new Map<string, ServiceOrder>();

  findById(id: string): Promise<ServiceOrder | null> {
    const order = this.orders.get(id);
    return Promise.resolve(order && !order.deletedAt ? order : null);
  }

  findMany({
    page,
    limit,
    status,
  }: ListServiceOrdersFilter): Promise<PaginatedServiceOrders> {
    const filtered = [...this.orders.values()]
      .filter((o) => !o.deletedAt)
      .filter((o) => (status ? o.status === status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.resolve({
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    });
  }

  save(order: ServiceOrder): Promise<void> {
    this.orders.set(order.id, order);
    return Promise.resolve();
  }
}
