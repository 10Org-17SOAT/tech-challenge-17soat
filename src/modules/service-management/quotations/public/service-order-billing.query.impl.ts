import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';
import type {
  ServiceOrderBilling,
  ServiceOrderBillingQuery,
} from './service-order-billing.query';

@Injectable()
export class ServiceOrderBillingQueryImpl implements ServiceOrderBillingQuery {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
  ) {}

  async findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<ServiceOrderBilling | null> {
    const order = await this.orderRepository.findById(serviceOrderId);
    if (!order) return null;

    // An order with no quotation has no price, so there is nothing to charge.
    // Reaching `finished` without one is impossible today — the only route
    // past `awaiting_approval` is approving a quotation — but the amount has
    // to come from somewhere, and this is the honest answer when it does not.
    const quotation =
      await this.quotationRepository.findByServiceOrderId(serviceOrderId);
    if (!quotation) return null;

    return {
      serviceOrderId: order.id,
      // The work is done and not yet paid for. Both halves matter: an order
      // still in execution is too early, and a delivered one is already paid.
      payable: order.status === 'finished' && quotation.status === 'approved',
      totalInCents: quotation.totalInCents,
    };
  }
}
