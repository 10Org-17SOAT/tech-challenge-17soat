import type { DomainEvent } from '../domain/events/domain-event';
import type { DomainEventPublisher } from '../domain/events/domain-event-publisher';

/** Test double that keeps what was published, so specs can assert on it. */
export class RecordingDomainEventPublisher implements DomainEventPublisher {
  readonly events: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.events.push(event);
  }
}