import type { DomainEvent } from '../../../../shared/domain/events/domain-event';

/**
 * Raised when a mechanic is claimed (allocated) for a service order. Published
 * by the use case after successful persistence. Prepares the microservice
 * split and future consumers (waiting queue, notifications).
 */
export class MechanicAllocated implements DomainEvent {
  readonly name = 'mechanics.mechanic-allocated';
  readonly occurredAt: Date;

  constructor(
    readonly mechanicId: string,
    readonly serviceOrderId: string,
  ) {
    this.occurredAt = new Date();
  }
}
