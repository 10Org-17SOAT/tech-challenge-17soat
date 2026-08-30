import type { DomainEvent } from '../../../../shared/domain/events/domain-event';

/**
 * Raised when a mechanic is released from a service order. Published by the
 * use case after successful persistence. Prepares the microservice split and
 * future consumers (waiting queue, notifications).
 */
export class MechanicReleased implements DomainEvent {
  readonly name = 'mechanics.mechanic-released';
  readonly occurredAt: Date;

  constructor(
    readonly mechanicId: string,
    readonly serviceOrderId: string,
  ) {
    this.occurredAt = new Date();
  }
}
