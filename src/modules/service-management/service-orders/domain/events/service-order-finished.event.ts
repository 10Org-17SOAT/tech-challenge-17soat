import type { DomainEvent } from '../../../../../shared/domain/events/domain-event';

/**
 * Raised when an order reaches `finished` — the work is done and the parts
 * that were reserved for it have actually been fitted. Consumed by stock,
 * which turns those reservations into definitive write-offs.
 *
 * Only the order id: what is still reserved for it is the ledger's own
 * answer, not something this event should try to carry.
 */
export class ServiceOrderFinished implements DomainEvent {
  readonly name = 'service-order.finished';
  readonly occurredAt: Date;

  constructor(readonly serviceOrderId: string) {
    this.occurredAt = new Date();
  }
}
