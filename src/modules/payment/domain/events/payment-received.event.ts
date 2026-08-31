import type { DomainEvent } from '../../../../shared/domain/events/domain-event';

/**
 * Raised when an order has been paid for. Carries only the reference: the sole
 * consumer looks the order up and closes it, and nothing downstream needs the
 * amount — the same reasoning that keeps `PurchaseRequestNeeded` down to one id.
 *
 * "Received" rather than "confirmed" because nothing was ever pending: a
 * `Payment` is born settled.
 */
export class PaymentReceived implements DomainEvent {
  readonly name = 'payment.received';
  readonly occurredAt: Date;

  constructor(readonly serviceOrderId: string) {
    this.occurredAt = new Date();
  }
}
