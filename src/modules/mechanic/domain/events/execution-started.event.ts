import type { DomainEvent } from '../../../../shared/domain/events/domain-event';

/**
 * Raised when a mechanic is allocated to a service order: claiming a mechanic
 * is what starts the execution. Consumed by service-management to move the
 * order from `awaiting_execution` to `in_execution`.
 */
export class ExecutionStarted implements DomainEvent {
  readonly name = 'mechanic.execution-started';
  readonly occurredAt: Date;

  constructor(readonly serviceOrderId: string) {
    this.occurredAt = new Date();
  }
}
