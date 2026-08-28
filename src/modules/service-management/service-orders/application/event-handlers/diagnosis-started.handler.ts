import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvalidServiceOrderTransitionError } from '../../domain/errors/invalid-service-order-transition.error';
import { DiagnosisStarted } from '../../domain/events/diagnosis-started.event';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/service-order.repository';
import type { ServiceOrderRepository } from '../../domain/service-order.repository';

@Injectable()
export class DiagnosisStartedHandler {
  private readonly logger = new Logger(DiagnosisStartedHandler.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  @OnEvent('mechanic.diagnosis-started')
  async handle(event: DiagnosisStarted): Promise<void> {
    const order = await this.orderRepository.findById(event.serviceOrderId);
    if (!order) {
      this.logger.warn(
        `Ignoring ${event.name}: order ${event.serviceOrderId} not found`,
      );
      return;
    }

    try {
      order.transitionTo('in_diagnosis');
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
