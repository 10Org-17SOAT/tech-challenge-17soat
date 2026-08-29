import type { DomainEvent } from './domain-event';

export interface DomainEventPublisher {
  publish(event: DomainEvent): void;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');