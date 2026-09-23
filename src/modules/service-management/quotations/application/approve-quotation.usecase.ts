import { Inject, Injectable } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../shared/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '../../../../shared/domain/events/domain-event-publisher';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { QuotationApproved } from '../domain/events/quotation-approved.event';
import { Quotation } from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';

/**
 * The customer accepting the price. Quotation and service order are separate
 * aggregates in the same module, so moving both is a direct call, not an
 * event — an event there would only add an asynchronous way to half-succeed.
 *
 * Crossing out of the module is the opposite case: `QuotationApproved` is how
 * stock learns to reserve the parts, and it stays an event precisely so this
 * use case keeps knowing nothing about the ledger.
 */
@Injectable()
export class ApproveQuotationUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
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

    // After both writes, never before: a subscriber that reserves stock must
    // not react to an approval that then failed to persist. `approve()`
    // refuses a second call, so this fires exactly once per quotation.
    this.eventPublisher.publish(
      new QuotationApproved(quotation.id, order.id, quotation.partLines),
    );

    return quotation;
  }
}
