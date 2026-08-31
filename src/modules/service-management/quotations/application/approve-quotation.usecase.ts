import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { Quotation } from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';

/**
 * The customer accepting the price. Quotation and service order are separate
 * aggregates in the same module, so this is a direct call, not an event —
 * events here would only add an asynchronous way to half-succeed.
 */
@Injectable()
export class ApproveQuotationUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(quotationId: string): Promise<Quotation> {
    const quotation = await this.quotationRepository.findById(quotationId);
    if (!quotation) {
      throw new QuotationNotFoundError(quotationId);
    }

    const order = await this.orderRepository.findById(quotation.serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(quotation.serviceOrderId);
    }

    // Both aggregates are mutated in memory first: an already-approved
    // quotation or an order that is not awaiting approval throws here, before
    // anything has been written. There is no transaction to roll back.
    quotation.approve();
    order.transitionTo('awaiting_execution');

    await this.quotationRepository.save(quotation);
    // Status last, always: it is what everyone downstream reads, so a failure
    // above leaves the order in a valid earlier state instead of a lying one.
    await this.orderRepository.save(order);

    return quotation;
  }
}
