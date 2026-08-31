import { ServiceItem } from '../domain/service-item';
import { ServiceOrder } from '../domain/service-order.entity';
import {
  ExecutionTimeFilter,
  ExecutionTimeStats,
  ListServiceOrdersFilter,
  ServiceOrderRepository,
  PaginatedServiceOrders,
} from '../domain/service-order.repository';

export class InMemoryServiceOrderRepository implements ServiceOrderRepository {
  readonly orders = new Map<string, ServiceOrder>();
  readonly items = new Map<string, ServiceItem[]>();

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

  findItems(serviceOrderId: string): Promise<ServiceItem[]> {
    return Promise.resolve(this.items.get(serviceOrderId) ?? []);
  }

  replaceItems(serviceOrderId: string, items: ServiceItem[]): Promise<void> {
    this.items.set(serviceOrderId, [...items]);
    return Promise.resolve();
  }

  averageExecutionTime({
    from,
    to,
  }: ExecutionTimeFilter): Promise<ExecutionTimeStats> {
    const durations: number[] = [];

    for (const order of this.orders.values()) {
      const { startedAt, completedAt } = order;
      if (order.deletedAt || order.status !== 'finished') continue;
      if (!startedAt || !completedAt) continue;
      if (from && completedAt < from) continue;
      if (to && completedAt > to) continue;
      durations.push((completedAt.getTime() - startedAt.getTime()) / 60_000);
    }

    if (durations.length === 0) {
      return Promise.resolve({ averageMinutes: null, sampleSize: 0 });
    }

    const total = durations.reduce((sum, minutes) => sum + minutes, 0);
    return Promise.resolve({
      averageMinutes: total / durations.length,
      sampleSize: durations.length,
    });
  }
}
