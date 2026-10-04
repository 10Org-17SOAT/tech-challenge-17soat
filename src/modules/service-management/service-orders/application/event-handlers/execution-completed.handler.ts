import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../../shared/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '../../../../../shared/domain/events/domain-event-publisher';
import { InvalidServiceOrderTransitionError } from '../../domain/errors/invalid-service-order-transition.error';
import { ExecutionCompleted } from '../../../../mechanic/domain/events/execution-completed.event';
import { ServiceOrderFinished } from '../../domain/events/service-order-finished.event';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/service-order.repository';
import type { ServiceOrderRepository } from '../../domain/service-order.repository';

/**
 * Turns the mechanic's "work is done" into the order reaching `finished`, and
 * re-announces that as `ServiceOrderFinished`. The two events are not
 * redundant: `mechanic.execution-completed` is a report from a person, this
 * one is the order's own status, and stock writes reservations off against
 * the status — never against someone's report of it.
 */
@Injectable()
export class ExecutionCompletedHandler {
  private readonly logger = new Logger(ExecutionCompletedHandler.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  @OnEvent('mechanic.execution-completed')
  async handle(event: ExecutionCompleted): Promise<void> {
    const order = await this.orderRepository.findById(event.serviceOrderId);
    if (!order) {
      this.logger.warn(
        `Ignoring ${event.name}: order ${event.serviceOrderId} not found`,
      );
      return;
    }

    try {
      order.transitionTo('finished');
    } catch (error) {
      if (error instanceof InvalidServiceOrderTransitionError) {
        this.logger.warn(`Ignoring ${event.name}: ${error.message}`);
        return;
      }
      throw error;
    }

    await this.orderRepository.save(order);

    // Only once the status is persisted. The early returns above guard
    // against a repeat: an order already past `finished` never transitions
    // again, so the write-offs downstream are not applied twice.
    this.eventPublisher.publish(new ServiceOrderFinished(order.id));
  }
}
