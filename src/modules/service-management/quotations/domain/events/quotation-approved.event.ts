import type { DomainEvent } from '../../../../../shared/domain/events/domain-event';
import type { QuotationPartLine } from '../quotation.entity';

/**
 * Raised when the customer accepts the price — from the panel or from the
 * email link, both paths publish it. Consumed by stock, which reserves the
 * parts the approved quotation commits the workshop to.
 *
 * It carries the part lines rather than just an id on purpose: the quotation
 * froze them at issue time, and stock must reserve exactly what the customer
 * approved, never a re-read of a catalogue that may have moved since. That
 * also keeps stock from having to query into service-management.
 */
export class QuotationApproved implements DomainEvent {
  readonly name = 'quotation.approved';
  readonly occurredAt: Date;

  constructor(
    readonly quotationId: string,
    readonly serviceOrderId: string,
    readonly parts: readonly QuotationPartLine[],
  ) {
    this.occurredAt = new Date();
  }
}
