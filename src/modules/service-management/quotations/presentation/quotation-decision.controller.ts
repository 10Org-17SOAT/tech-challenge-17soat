import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DecideQuotationByTokenUseCase } from '../application/decide-quotation-by-token.usecase';
import {
  QuotationDecisionDto,
  QuotationResponseDto,
  toQuotationResponse,
} from './dtos/quotation.dtos';
import { QuotationErrorsFilter } from './quotation-errors.filter';
import { Public } from '../../../auth/public/roles';

/**
 * The customer's answer to a quotation, in JSON, for any caller outside the
 * workshop. The decision page the email links to posts to its HTML twin
 * instead; both go through the same use case.
 */
// Anonymous by design: whoever holds the token from the email is answering
// for the customer, and it is scoped to one quotation and expires.
@Public()
@ApiTags('quotations')
@Controller('quotations')
@UseFilters(QuotationErrorsFilter)
export class QuotationDecisionController {
  constructor(private readonly decideByToken: DecideQuotationByTokenUseCase) {}

  @Post('decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recebe a aprovação ou a recusa do cliente para um orçamento',
    description:
      'Autenticado pelo token do link enviado por email, sem login. ' +
      'Aprovar avança a OS para awaiting_execution; recusar grava o motivo e ' +
      'devolve a OS para in_diagnosis, para que um novo orçamento seja emitido. ' +
      'Repetir a mesma decisão responde 200 com o estado atual; a decisão ' +
      'contrária à já registrada responde 409.',
  })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @ApiResponse({ status: 400, description: 'Body inválido' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  @ApiResponse({ status: 404, description: 'OS do orçamento não encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'Orçamento já decidido no sentido contrário, ou OS não está aguardando aprovação',
  })
  async decide(
    @Body() body: QuotationDecisionDto,
  ): Promise<QuotationResponseDto> {
    return toQuotationResponse(await this.decideByToken.execute(body));
  }
}
