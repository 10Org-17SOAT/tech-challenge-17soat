import type { DomainEvent } from '../../../shared/domain/events/domain-event';
import type { DomainEventPublisher } from '../../../shared/domain/events/domain-event-publisher';

/**
 * Test double that keeps what was published, so specs can assert on it.
 *
 * One per bounded context, mirroring stock's and mechanic's. It sits at the
 * service-management root rather than inside quotations or service-orders
 * because both publish now, and those two already share test doubles across
 * the folder — they are one context, not two.
 */
export class RecordingDomainEventPublisher implements DomainEventPublisher {
  readonly events: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.events.push(event);
  }
}
