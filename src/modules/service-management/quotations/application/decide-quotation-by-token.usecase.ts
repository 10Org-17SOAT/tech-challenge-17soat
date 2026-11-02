import { Injectable } from '@nestjs/common';
import { Quotation, QuotationDecision } from '../domain/quotation.entity';
import { ApproveQuotationUseCase } from './approve-quotation.usecase';
import { GetQuotationByTokenUseCase } from './get-quotation-by-token.usecase';
import { RejectQuotationUseCase } from './reject-quotation.usecase';

export interface DecideQuotationByTokenInput {
  token: string;
  decision: QuotationDecision;
  reason?: string | null;
}

/**
 * The customer's answer arriving from outside the workshop — the decision page
 * the email links to, or any other caller holding the link's token. The token
 * is the credential, and it only picks the quotation: what approving or
 * rejecting does is ApproveQuotationUseCase's and RejectQuotationUseCase's
 * call, so there is one rule for each, whoever registers it.
 */
@Injectable()
export class DecideQuotationByTokenUseCase {
  constructor(
    private readonly getByToken: GetQuotationByTokenUseCase,
    private readonly approveQuotation: ApproveQuotationUseCase,
    private readonly rejectQuotation: RejectQuotationUseCase,
  ) {}

  async execute(input: DecideQuotationByTokenInput): Promise<Quotation> {
    const quotation = await this.getByToken.execute(input.token);

    // Idempotent for the same answer: a double-submitted form or a caller
    // retrying after a timeout gets the decision it already made, not an
    // error. The opposite answer still reaches the domain, which refuses it.
    if (quotation.isDecidedAs(input.decision)) {
      return quotation;
    }

    return input.decision === 'approved'
      ? this.approveQuotation.execute(quotation.id)
      : this.rejectQuotation.execute(quotation.id, input.reason);
  }
}
