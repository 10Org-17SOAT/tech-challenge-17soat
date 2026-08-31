import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { PaymentReceived } from '../../../../payment/domain/events/payment-received.event';
import { InvalidServiceOrderTransitionError } from '../../domain/errors/invalid-service-order-transition.error';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/service-order.repository';
import type { ServiceOrderRepository } from '../../domain/service-order.repository';

/**
 * Closes the loop the payment context opens: paying for a finished order is
 * what delivers it. `PaymentReceived` is imported `type`-only from the
 * payment module — it never reaches the compiled output, so there is no
 * runtime dependency from service-orders on payment, only on the event's
 * shape and the `payment.received` string `@OnEvent` matches against.
 *
 * Tolerant like `ExecutionStartedHandler` and `ExecutionCompletedHandler`: an
 * order that no longer exists, or is not in `finished`, is logged and
 * skipped rather than thrown. There is a real gap here — `emit()` is
 * fire-and-forget, so a failure below leaves the payment recorded and the
 * order stuck in `finished` with no retry path, since the payment side's
 * unique constraint now refuses a second attempt. Accepted for this mock; a
 * real gateway would need an outbox or an at-least-once bus instead.
 */
@Injectable()
export class PaymentReceivedHandler {
  private readonly logger = new Logger(PaymentReceivedHandler.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  @OnEvent('payment.received')
  async handle(event: PaymentReceived): Promise<void> {
    const order = await this.orderRepository.findById(event.serviceOrderId);
    if (!order) {
      this.logger.warn(
        `Ignoring ${event.name}: order ${event.serviceOrderId} not found`,
      );
      return;
    }

    try {
      order.transitionTo('delivered');
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
