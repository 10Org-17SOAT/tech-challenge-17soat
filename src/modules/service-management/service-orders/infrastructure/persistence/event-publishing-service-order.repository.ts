import type { DomainEventPublisher } from '../../../../../shared/domain/events/domain-event-publisher';
import type { ServiceItem } from '../../domain/service-item';
import type { ServiceOrder } from '../../domain/service-order.entity';
import type {
  ExecutionTimeFilter,
  ExecutionTimeStats,
  ListServiceOrdersFilter,
  PaginatedServiceOrders,
  ServiceOrderRepository,
} from '../../domain/service-order.repository';

/**
 * Publishes what an order raised, right after the write that made it true.
 *
 * Status changes happen in six places across three submodules, and every one
 * of them already ends in `save()`. Publishing here means none of them has to
 * remember to — a new transition added later announces itself for free. A
 * save that throws publishes nothing: `pullEvents()` is only reached once the
 * delegate has resolved.
 */
export class EventPublishingServiceOrderRepository implements ServiceOrderRepository {
  constructor(
    private readonly delegate: ServiceOrderRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async save(order: ServiceOrder): Promise<void> {
    await this.delegate.save(order);
    for (const event of order.pullEvents()) {
      this.eventPublisher.publish(event);
    }
  }

  findById(id: string): Promise<ServiceOrder | null> {
    return this.delegate.findById(id);
  }

  findMany(filter: ListServiceOrdersFilter): Promise<PaginatedServiceOrders> {
    return this.delegate.findMany(filter);
  }

  findItems(serviceOrderId: string): Promise<ServiceItem[]> {
    return this.delegate.findItems(serviceOrderId);
  }

  replaceItems(serviceOrderId: string, items: ServiceItem[]): Promise<void> {
    return this.delegate.replaceItems(serviceOrderId, items);
  }

  averageExecutionTime(
    filter: ExecutionTimeFilter,
  ): Promise<ExecutionTimeStats> {
    return this.delegate.averageExecutionTime(filter);
  }
}
