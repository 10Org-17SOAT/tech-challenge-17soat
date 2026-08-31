import type { DomainEvent } from '../../../../../shared/domain/events/domain-event';

/**
 * Provisional contract: the mechanic module does not exist yet, so
 * service-orders owns this event definition until that module is built and
 * becomes its real publisher.
 */
export class ExecutionCompleted implements DomainEvent {
  readonly name = 'mechanic.execution-completed';
  readonly occurredAt: Date;

  constructor(readonly serviceOrderId: string) {
    this.occurredAt = new Date();
  }
}
