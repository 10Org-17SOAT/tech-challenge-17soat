import { Inject, Injectable, Logger } from '@nestjs/common';
import { IssueQuotationUseCase } from '../../quotations/application/issue-quotation.usecase';
import { SendQuotationApprovalEmailUseCase } from '../../quotations/application/send-quotation-approval-email.usecase';
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
 *
 * The approval email goes out from here too, but on a different footing: it is
 * I/O against a third party and is allowed to fail on its own. See the catch
 * at the end.
 */
@Injectable()
export class CompleteDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnosisRepository: DiagnosisRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    private readonly issueQuotation: IssueQuotationUseCase,
    private readonly sendApprovalEmail: SendQuotationApprovalEmailUseCase,
  ) {}

  private readonly logger = new Logger(CompleteDiagnosisUseCase.name);

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
    let quotation = await this.issueQuotation.execute(input.serviceOrderId);
    // Status last: if pricing fails above, the order stays in `in_diagnosis`
    // and the whole act can simply be retried.
    await this.orderRepository.save(order);

    // Deliberately swallowed. Everything above has been written and the
    // diagnosis is complete and correct; letting a mail provider's outage
    // throw here would return a 500 on work that succeeded, and the retry
    // would then die on `awaiting_approval -> awaiting_approval` with the
    // mechanic unable to close the order at all.
    //
    // The cost is that a failed send is only a log line. `approvalEmailSentAt`
    // stays null so the miss is visible, and
    // `POST /quotations/:id/send-approval-email` recovers it.
    try {
      // Reassigned, not discarded: sending reloads the quotation and stamps
      // `approvalEmailSentAt` on that copy. Returning the pre-send instance
      // would report null on the very response that should say the email went
      // out. On failure the original stays, and null is then the truth.
      quotation = await this.sendApprovalEmail.execute(quotation.id);
    } catch (error) {
      this.logger.error(
        `Quotation ${quotation.id} was issued but its approval email failed to send`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return { diagnosis, quotation };
  }
}
