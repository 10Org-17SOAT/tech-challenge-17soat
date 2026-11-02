import type { DomainEvent } from '../../../../../shared/domain/events/domain-event';
import type { ServiceOrderStatus } from '../service-order.entity';

/**
 * Raised on every status an order reaches, opening included — `from` is null
 * only for `received`. Recorded by the entity itself, so no caller can move
 * an order and forget to announce it, and published by the repository once
 * the write has gone through. Consumed by notifications, which emails the
 * customer.
 */
export class ServiceOrderStatusChanged implements DomainEvent {
  readonly name = 'service-order.status-changed';
  readonly occurredAt: Date;

  constructor(
    readonly serviceOrderId: string,
    readonly from: ServiceOrderStatus | null,
    readonly to: ServiceOrderStatus,
    occurredAt: Date = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}
