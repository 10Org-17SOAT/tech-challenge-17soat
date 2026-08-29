import type { DomainEvent } from '../../../../../shared/domain/events/domain-event';

/**
 * Provisional contract: the quotation/customer-approval module does not exist
 * yet, so service-orders owns this event definition until that module is
 * built and becomes its real publisher.
 */
export class QuotationApproved implements DomainEvent {
  readonly name = 'quotation.approved';
  readonly occurredAt: Date;

  constructor(readonly serviceOrderId: string) {
    this.occurredAt = new Date();
  }
}
