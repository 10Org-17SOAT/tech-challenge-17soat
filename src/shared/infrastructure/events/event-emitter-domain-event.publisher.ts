import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DomainEvent } from '../../domain/events/domain-event';
import type { DomainEventPublisher } from '../../domain/events/domain-event-publisher';

@Injectable()
export class EventEmitter2DomainEventPublisher implements DomainEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: DomainEvent): void {
    this.emitter.emit(event.name, event);
  }
}
