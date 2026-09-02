import { Inject, Injectable } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '../../../shared/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '../../../shared/domain/events/domain-event-publisher';
import { SERVICE_ORDER_BILLING_QUERY } from '../../service-management/quotations/public/service-order-billing.query';
import type { ServiceOrderBillingQuery } from '../../service-management/quotations/public/service-order-billing.query';
import { PaymentReceived } from '../domain/events/payment-received.event';
import { ServiceOrderNotFoundForPaymentError } from '../domain/errors/service-order-not-found-for-payment.error';
import { ServiceOrderNotPayableError } from '../domain/errors/service-order-not-payable.error';
import { Payment } from '../domain/payment.entity';
import { PAYMENT_REPOSITORY } from '../domain/payment.repository';
import type { PaymentRepository } from '../domain/payment.repository';

/**
 * Takes payment for a service order. There is no gateway to call — settlement
 * is mocked, so a `Payment` is created already paid — but the boundary with
 * service-management is real: eligibility and amount are read through
 * `SERVICE_ORDER_BILLING_QUERY`, the only door into that context, and the
 * order is only ever told about the result through `payment.received`, never
 * called into directly.
 */
@Injectable()
export class SettlePaymentUseCase {
  constructor(
    @Inject(SERVICE_ORDER_BILLING_QUERY)
    private readonly billingQuery: ServiceOrderBillingQuery,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(serviceOrderId: string): Promise<Payment> {
    const billing =
      await this.billingQuery.findByServiceOrderId(serviceOrderId);
    if (!billing) {
      throw new ServiceOrderNotFoundForPaymentError(serviceOrderId);
    }
    if (!billing.payable) {
      throw new ServiceOrderNotPayableError(serviceOrderId);
    }

    const payment = Payment.settle({
      serviceOrderReference: serviceOrderId,
      amountInCents: billing.totalInCents,
    });

    // The unique constraint on `service_order_reference` is the actual guard
    // against paying the same order twice — a prior read-then-write here
    // would just be a slower way to lose the same race. The repository
    // translates the constraint violation into `ServiceOrderAlreadyPaidError`.
    await this.paymentRepository.insert(payment);

    // Fire-and-forget: if the handler on the other side fails or never runs,
    // the order stays "finished" and the unique constraint above now blocks
    // any retry from ever reaching it again. That gap is accepted for this
    // mock — a real gateway would need an outbox or an at-least-once bus here.
    this.eventPublisher.publish(new PaymentReceived(serviceOrderId));

    return payment;
  }
}
