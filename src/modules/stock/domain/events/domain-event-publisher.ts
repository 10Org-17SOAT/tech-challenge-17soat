import type { DomainEvent } from '@/modules/stock/domain/events/domain-event';

export interface DomainEventPublisher {
  publish(event: DomainEvent): void;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');
