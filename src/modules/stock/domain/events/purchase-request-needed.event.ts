import type { DomainEvent } from './domain-event';

/**
 * Raised when a stock lookup finds a supply with no units left to reserve —
 * the "solicitação de compra" branch of the event storming. It carries only the
 * supply id: whoever consumes it re-reads the ledger for a fresh balance.
 */
export class PurchaseRequestNeeded implements DomainEvent {
  readonly name = 'stock.purchase-request-needed';
  readonly occurredAt: Date;

  constructor(readonly supplyId: string) {
    this.occurredAt = new Date();
  }
}
