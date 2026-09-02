import type { DomainEvent } from '../../../../shared/domain/events/domain-event';

/**
 * Raised when the mechanic reports the work on a service order as done.
 * Consumed by service-management to move the order to `finished`.
 */
export class ExecutionCompleted implements DomainEvent {
  readonly name = 'mechanic.execution-completed';
  readonly occurredAt: Date;

  constructor(readonly serviceOrderId: string) {
    this.occurredAt = new Date();
  }
}
