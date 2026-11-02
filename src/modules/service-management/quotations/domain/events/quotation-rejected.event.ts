import type { DomainEvent } from '../../../../../shared/domain/events/domain-event';

/**
 * Raised once a rejection has been written, and the order sent back to
 * diagnosis. Nothing in this API consumes it yet: the order's transition is a
 * direct call in the same module, like approval's. It is the hook for whoever
 * needs to hear that a customer said no — telling the workshop, for one.
 */
export class QuotationRejected implements DomainEvent {
  readonly name = 'quotation.rejected';
  readonly occurredAt: Date;

  constructor(
    readonly quotationId: string,
    readonly serviceOrderId: string,
    readonly reason: string | null,
  ) {
    this.occurredAt = new Date();
  }
}
