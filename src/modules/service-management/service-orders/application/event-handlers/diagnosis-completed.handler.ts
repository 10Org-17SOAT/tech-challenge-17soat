import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvalidServiceOrderTransitionError } from '../../domain/errors/invalid-service-order-transition.error';
import { DiagnosisCompleted } from '../../domain/events/diagnosis-completed.event';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/service-order.repository';
import type { ServiceOrderRepository } from '../../domain/service-order.repository';

@Injectable()
export class DiagnosisCompletedHandler {
  private readonly logger = new Logger(DiagnosisCompletedHandler.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  @OnEvent('mechanic.diagnosis-completed')
  async handle(event: DiagnosisCompleted): Promise<void> {
    const order = await this.orderRepository.findById(event.serviceOrderId);
    if (!order) {
      this.logger.warn(
        `Ignoring ${event.name}: order ${event.serviceOrderId} not found`,
      );
      return;
    }

    try {
      order.transitionTo('awaiting_approval');
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
