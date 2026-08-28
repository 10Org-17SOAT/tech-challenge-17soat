import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvalidServiceOrderTransitionError } from '../../domain/errors/invalid-service-order-transition.error';
import { QuotationApproved } from '../../domain/events/quotation-approved.event';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/service-order.repository';
import type { ServiceOrderRepository } from '../../domain/service-order.repository';

@Injectable()
export class QuotationApprovedHandler {
  private readonly logger = new Logger(QuotationApprovedHandler.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  @OnEvent('quotation.approved')
  async handle(event: QuotationApproved): Promise<void> {
    const order = await this.orderRepository.findById(event.serviceOrderId);
    if (!order) {
      this.logger.warn(
        `Ignoring ${event.name}: order ${event.serviceOrderId} not found`,
      );
      return;
    }

    try {
      order.transitionTo('awaiting_execution');
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
