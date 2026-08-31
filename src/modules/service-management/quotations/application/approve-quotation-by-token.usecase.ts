import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { Quotation } from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';

/**
 * The customer approving from the email link.
 *
 * Same two writes as ApproveQuotationUseCase and in the same order — the
 * quotation first, the order's status last — so a failure between them leaves
 * the order in a valid earlier state rather than a lying one.
 */
@Injectable()
export class ApproveQuotationByTokenUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(rawToken: string): Promise<Quotation> {
    // Hashed here: the raw token never reaches a query, and an unknown token
    // is indistinguishable from a wrong one.
    const hash = Quotation.hashApprovalToken(rawToken);
    const quotation =
      await this.quotationRepository.findByApprovalTokenHash(hash);
    if (!quotation) {
      throw new InvalidApprovalTokenError();
    }

    const order = await this.orderRepository.findById(quotation.serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(quotation.serviceOrderId);
    }

    // Both aggregates are mutated in memory first: an expired token, an
    // already-approved quotation or an order that is not awaiting approval all
    // throw here, before anything has been written.
    quotation.approveWithToken(rawToken);
    order.transitionTo('awaiting_execution');

    await this.quotationRepository.save(quotation);
    await this.orderRepository.save(order);

    return quotation;
  }
}
