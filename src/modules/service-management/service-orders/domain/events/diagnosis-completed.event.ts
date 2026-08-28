import type { DomainEvent } from '../../../../../shared/domain/events/domain-event';

/**
 * Provisional contract: the mechanic module does not exist yet, so
 * service-orders owns this event definition until that module is built and
 * becomes its real publisher.
 */
export class DiagnosisCompleted implements DomainEvent {
  readonly name = 'mechanic.diagnosis-completed';
  readonly occurredAt: Date;

  constructor(readonly serviceOrderId: string) {
    this.occurredAt = new Date();
  }
}
