import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
  UseFilters,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DecideQuotationByTokenUseCase } from '../application/decide-quotation-by-token.usecase';
import { GetQuotationByTokenUseCase } from '../application/get-quotation-by-token.usecase';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { InvalidQuotationError } from '../domain/errors/invalid-quotation.error';
import {
  QUOTATION_DECISIONS,
  type QuotationDecision,
} from '../domain/quotation.entity';
import {
  renderDecisionPage,
  renderDecisionResult,
} from './decision-page.template';
import { DecisionPageErrorsFilter } from './decision-page-errors.filter';
import { Public } from '../../../auth/public/roles';

function parseDecision(value: unknown): QuotationDecision | null {
  return QUOTATION_DECISIONS.find((decision) => decision === value) ?? null;
}

/**
 * The page the approval email links to, and the form it submits. Separate
 * from the JSON controllers on purpose: it answers in HTML and carries its own
 * error filter, so the API and these pages never contaminate each other.
 *
 * Inputs are checked by hand rather than by a Zod DTO: the global pipe would
 * answer a bad one with a JSON 400, which is the one thing a page a customer
 * opens must never do.
 */
// Anonymous by design: the customer follows the link straight from the
// email, with no session. The signed token is the credential.
@Public()
@ApiExcludeController()
@Controller('quotations')
@UseFilters(DecisionPageErrorsFilter)
export class QuotationDecisionPageController {
  constructor(
    private readonly getByToken: GetQuotationByTokenUseCase,
    private readonly decideByToken: DecideQuotationByTokenUseCase,
  ) {}

  /**
   * Where links emailed before the decision page existed point. It used to
   * approve on the spot, which a mail scanner following the link would do
   * too; now it only forwards to the page, so those links keep working
   * without a GET ever changing anything.
   */
  @Get('approve')
  @Redirect()
  approve(@Query('token') token?: string): { url: string } {
    return {
      url: `decision?token=${encodeURIComponent(token ?? '')}&decision=approved`,
    };
  }

  @Get('decision')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async show(
    @Query('token') token?: string,
    @Query('decision') decision?: string,
  ): Promise<string> {
    if (!token) {
      throw new InvalidApprovalTokenError();
    }
    const quotation = await this.getByToken.execute(token);
    // Already answered — by this link, or by the attendant over the phone.
    // There is nothing left to ask, so show where it stands.
    if (quotation.status !== 'issued') {
      return renderDecisionResult(quotation);
    }
    return renderDecisionPage(quotation, token, parseDecision(decision));
  }

  @Post('decision/confirm')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/html; charset=utf-8')
  async confirm(
    @Body('token') token?: unknown,
    @Body('decision') decision?: unknown,
    @Body('reason') reason?: unknown,
  ): Promise<string> {
    if (typeof token !== 'string' || token.length === 0) {
      throw new InvalidApprovalTokenError();
    }
    const parsed = parseDecision(decision);
    if (!parsed || (reason !== undefined && typeof reason !== 'string')) {
      throw new InvalidQuotationError('Invalid decision form');
    }
    return renderDecisionResult(
      await this.decideByToken.execute({
        token,
        decision: parsed,
        reason,
      }),
    );
  }
}
