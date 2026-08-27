import type { DomainEvent } from './domain-event';

export class PartWrittenOffFromStock implements DomainEvent {
  readonly name = 'stock.part-written-off-from-stock';
  readonly occurredAt: Date;

  constructor(
    readonly supplyId: string,
    readonly quantity: number,
    readonly serviceOrderReference: string,
  ) {
    this.occurredAt = new Date();
  }
}
