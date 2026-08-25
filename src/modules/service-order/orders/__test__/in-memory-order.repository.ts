import { Order } from '../domain/order.entity';
import {
  ListOrdersFilter,
  OrderRepository,
  PaginatedOrders,
} from '../domain/order.repository';

export class InMemoryOrderRepository implements OrderRepository {
  readonly orders = new Map<string, Order>();

  findById(id: string): Promise<Order | null> {
    const order = this.orders.get(id);
    return Promise.resolve(order && !order.deletedAt ? order : null);
  }

  findMany({
    page,
    limit,
    status,
  }: ListOrdersFilter): Promise<PaginatedOrders> {
    const filtered = [...this.orders.values()]
      .filter((o) => !o.deletedAt)
      .filter((o) => (status ? o.status === status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.resolve({
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    });
  }

  save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
    return Promise.resolve();
  }
}
