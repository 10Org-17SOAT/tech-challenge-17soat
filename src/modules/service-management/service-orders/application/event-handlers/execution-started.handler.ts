import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvalidServiceOrderTransitionError } from '../../domain/errors/invalid-service-order-transition.error';
import { ExecutionStarted } from '../../domain/events/execution-started.event';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/service-order.repository';
import type { ServiceOrderRepository } from '../../domain/service-order.repository';

@Injectable()
export class ExecutionStartedHandler {
  private readonly logger = new Logger(ExecutionStartedHandler.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  @OnEvent('mechanic.execution-started')
  async handle(event: ExecutionStarted): Promise<void> {
    const order = await this.orderRepository.findById(event.serviceOrderId);
    if (!order) {
      this.logger.warn(
        `Ignoring ${event.name}: order ${event.serviceOrderId} not found`,
      );
      return;
    }

    try {
      order.transitionTo('in_execution');
    } catch (error) {
      if (error instanceof InvalidServiceOrderTransitionError) {
        this.logger.warn(`Ignoring ${event.name}: ${error.message}`);
        return;
      }
      throw error;
    }

    await this.orderRepository.save(order);
  }
}
