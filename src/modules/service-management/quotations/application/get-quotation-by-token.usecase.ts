import { Inject, Injectable } from '@nestjs/common';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { Quotation } from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';

/**
 * Resolves the quotation behind the link in the email, refusing the link the
 * way every token route must: unknown, never issued, rotated or expired. Reads
 * only — it is what the decision page shows before the customer answers.
 */
@Injectable()
export class GetQuotationByTokenUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
  ) {}

  async execute(rawToken: string): Promise<Quotation> {
    // Hashed here: the raw token never reaches a query, and an unknown token
    // is indistinguishable from a wrong one.
    const quotation = await this.quotationRepository.findByApprovalTokenHash(
      Quotation.hashApprovalToken(rawToken),
    );
    if (!quotation) {
      throw new InvalidApprovalTokenError();
    }

    quotation.verifyApprovalToken(rawToken);
    return quotation;
  }
}
