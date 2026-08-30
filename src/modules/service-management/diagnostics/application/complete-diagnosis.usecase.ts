import { Inject, Injectable } from '@nestjs/common';
import { IssueQuotationUseCase } from '../../quotations/application/issue-quotation.usecase';
import { Quotation } from '../../quotations/domain/quotation.entity';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { ServiceItem } from '../../service-orders/domain/service-item';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { Diagnosis } from '../domain/diagnosis.entity';
import { DIAGNOSIS_REPOSITORY } from '../domain/diagnosis.repository';
import type { DiagnosisRepository } from '../domain/diagnosis.repository';

export interface CompleteDiagnosisInput {
  serviceOrderId: string;
  findings: string;
  serviceItems: { serviceId: string; quantity: number }[];
}

export interface CompleteDiagnosisOutput {
  diagnosis: Diagnosis;
  quotation: Quotation;
}

/**
 * One business act: the mechanic records what the vehicle needs, and the
 * quotation falls out of it automatically. Because the two happen together,
 * `awaiting_approval` never means "waiting on a quotation that does not exist
 * yet" — by the time the order reaches that status the customer has a price.
 */
@Injectable()
export class CompleteDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnosisRepository: DiagnosisRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    private readonly issueQuotation: IssueQuotationUseCase,
  ) {}

  async execute(
    input: CompleteDiagnosisInput,
  ): Promise<CompleteDiagnosisOutput> {
    const order = await this.orderRepository.findById(input.serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(input.serviceOrderId);
    }

    // Everything that can be rejected is built and validated in memory first:
    // bad findings, a zero quantity or an order that is not in diagnosis all
    // throw before the first write.
    const diagnosis = Diagnosis.create({
      serviceOrderId: input.serviceOrderId,
      findings: input.findings,
    });
    const serviceItems = input.serviceItems.map((item) =>
      ServiceItem.create(item),
    );
    order.transitionTo('awaiting_approval');

    await this.diagnosisRepository.save(diagnosis);
    await this.orderRepository.replaceItems(input.serviceOrderId, serviceItems);
    const quotation = await this.issueQuotation.execute(input.serviceOrderId);
    // Status last: if pricing fails above, the order stays in `in_diagnosis`
    // and the whole act can simply be retried.
    await this.orderRepository.save(order);

    return { diagnosis, quotation };
  }
}
