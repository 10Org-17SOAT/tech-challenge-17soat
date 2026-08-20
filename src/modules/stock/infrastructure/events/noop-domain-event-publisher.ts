import { Injectable } from '@nestjs/common';
import type { DomainEventPublisher } from '../../domain/events/domain-event-publisher';

/**
 * Placeholder adapter: the stock events have no consumer yet, so publishing is
 * intentionally a no-op. Swapping in a real dispatcher is a provider change in
 * StockModule — no call site moves.
 */
@Injectable()
export class NoopDomainEventPublisher implements DomainEventPublisher {
  // The event argument is deliberately ignored (and so left unnamed): there is
  // no subscriber yet — see docs/product/controle-de-estoque.md § Scope.
  publish(): void {}
}
