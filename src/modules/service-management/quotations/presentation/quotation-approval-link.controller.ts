import { Controller, Get, Header, Query, UseFilters } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ApproveQuotationByTokenUseCase } from '../application/approve-quotation-by-token.usecase';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { renderApprovalSuccess } from './approval-result.template';
import { ApprovalLinkErrorsFilter } from './approval-link-errors.filter';

/**
 * The link from the approval email. Separate from QuotationsController on
 * purpose: it answers in HTML and carries its own error filter, so the JSON
 * API and this page never contaminate each other.
 *
 * Approving on a GET is a deliberate, known trade-off. Mail scanners and
 * prefetchers do follow links in messages, and one that does will approve the
 * quotation before the customer opens it.
 */
@ApiExcludeController()
@Controller('quotations')
@UseFilters(ApprovalLinkErrorsFilter)
export class QuotationApprovalLinkController {
  constructor(
    private readonly approveByToken: ApproveQuotationByTokenUseCase,
  ) {}

  @Get('approve')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async approve(@Query('token') token?: string): Promise<string> {
    // Validated here rather than by a Zod pipe: a pipe would answer a missing
    // token with a JSON 400, which is the one thing this route must never do.
    if (!token) {
      throw new InvalidApprovalTokenError();
    }
    return renderApprovalSuccess(await this.approveByToken.execute(token));
  }
}
