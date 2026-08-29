import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DOMAIN_EVENT_PUBLISHER } from '../domain/events/domain-event-publisher';
import { EventEmitter2DomainEventPublisher } from '../infrastructure/events/event-emitter-domain-event.publisher';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: EventEmitter2DomainEventPublisher,
    },
  ],
  exports: [DOMAIN_EVENT_PUBLISHER, EventEmitterModule],
})
export class SharedEventsModule {}
