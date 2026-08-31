import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveQuotationUseCase } from '../application/approve-quotation.usecase';
import { GetQuotationUseCase } from '../application/get-quotation.usecase';
import { SendQuotationApprovalEmailUseCase } from '../application/send-quotation-approval-email.usecase';
import {
  QuotationIdParamDto,
  QuotationResponseDto,
  toQuotationResponse,
} from './dtos/quotation.dtos';
import { QuotationErrorsFilter } from './quotation-errors.filter';

@ApiTags('quotations')
@Controller('quotations')
@UseFilters(QuotationErrorsFilter)
export class QuotationsController {
  constructor(
    private readonly getQuotation: GetQuotationUseCase,
    private readonly approveQuotation: ApproveQuotationUseCase,
    private readonly sendApprovalEmail: SendQuotationApprovalEmailUseCase,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um orçamento por ID' })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @ApiResponse({ status: 404, description: 'Orçamento não encontrado' })
  async getById(
    @Param() params: QuotationIdParamDto,
  ): Promise<QuotationResponseDto> {
    return toQuotationResponse(await this.getQuotation.execute(params.id));
  }

  @Post(':id/send-approval-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenvia o email de aprovação, gerando um novo link',
    description:
      'O link anterior deixa de funcionar: apenas o hash do token fica gravado, ' +
      'então reenviar obrigatoriamente rotaciona. Use quando o envio automático ' +
      'do diagnóstico falhou (approvalEmailSentAt nulo) ou o cliente perdeu o email.',
  })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @ApiResponse({ status: 404, description: 'Orçamento não encontrado' })
  @ApiResponse({
    status: 422,
    description: 'OS sem veículo ou veículo sem dono acessível',
  })
  async sendEmail(
    @Param() params: QuotationIdParamDto,
  ): Promise<QuotationResponseDto> {
    return toQuotationResponse(await this.sendApprovalEmail.execute(params.id));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cliente aprova o orçamento e a OS avança para awaiting_execution',
  })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @ApiResponse({ status: 404, description: 'Orçamento ou OS não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Orçamento já aprovado ou OS não está aguardando aprovação',
  })
  async approve(
    @Param() params: QuotationIdParamDto,
  ): Promise<QuotationResponseDto> {
    return toQuotationResponse(await this.approveQuotation.execute(params.id));
  }
}
