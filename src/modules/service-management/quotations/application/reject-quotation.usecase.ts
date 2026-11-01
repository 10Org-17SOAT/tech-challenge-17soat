import { Inject, Injectable } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../shared/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '../../../../shared/domain/events/domain-event-publisher';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { QuotationRejected } from '../domain/events/quotation-rejected.event';
import { Quotation } from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';

/**
 * The customer turning the price down. The mirror of ApproveQuotationUseCase:
 * the same two aggregates, mutated in memory first and written in the same
 * order, with the order sent back to `in_diagnosis` instead of forward.
 */
@Injectable()
export class RejectQuotationUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    quotationId: string,
    reason?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.quotationRepository.findById(quotationId);
    if (!quotation) {
      throw new QuotationNotFoundError(quotationId);
    }

    const order = await this.orderRepository.findById(quotation.serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(quotation.serviceOrderId);
    }

    // An already-decided quotation, a reason over the limit or an order that
    // is not awaiting approval all throw here, before anything is written.
    quotation.reject(reason);
    order.transitionTo('in_diagnosis');

    await this.quotationRepository.save(quotation);
    await this.orderRepository.save(order);

    // Only once both writes landed: a listener must never hear about a
    // rejection that a failed save then took back.
    this.eventPublisher.publish(
      new QuotationRejected(
        quotation.id,
        quotation.serviceOrderId,
        quotation.rejectionReason,
      ),
    );

    return quotation;
  }
}
