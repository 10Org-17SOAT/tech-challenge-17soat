import type { DomainEvent } from '@/modules/stock/domain/events/domain-event';

/**
 * Raised when a reservation is accepted — the "AT Estoquista → CMD reserva
 * peça para OS" branch of the event storming. Carries the quantities that
 * were actually committed, not a re-derived balance: whoever consumes it is
 * reacting to *this* reservation, not asking for a fresh read.
 */
export class PartReservedForServiceOrder implements DomainEvent {
  readonly name = 'stock.part-reserved-for-service-order';
  readonly occurredAt: Date;

  constructor(
    readonly supplyId: string,
    readonly quantity: number,
    readonly serviceOrderReference: string,
  ) {
    this.occurredAt = new Date();
  }
}
