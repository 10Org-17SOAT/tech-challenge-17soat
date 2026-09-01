import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetPaymentUseCase } from '../application/get-payment.usecase';
import { SettlePaymentUseCase } from '../application/settle-payment.usecase';
import {
  PaymentIdParamDto,
  PaymentResponseDto,
  SettlePaymentDto,
  toPaymentResponse,
} from './dtos/payment.dtos';
import { PaymentErrorsFilter } from './payment-errors.filter';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/roles/role.enum';

@ApiTags('payments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('payments')
@UseFilters(PaymentErrorsFilter)
export class PaymentsController {
  constructor(
    private readonly settlePayment: SettlePaymentUseCase,
    private readonly getPayment: GetPaymentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra o pagamento de uma OS finalizada',
    description:
      'Pagamento mockado: não há gateway, o pagamento nasce confirmado. ' +
      'Publica payment.received, que move a OS de finished para delivered.',
  })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({
    status: 404,
    description: 'OS não encontrada ou sem orçamento',
  })
  @ApiResponse({
    status: 409,
    description: 'OS não está finished, ou já foi paga',
  })
  async settle(@Body() body: SettlePaymentDto): Promise<PaymentResponseDto> {
    return toPaymentResponse(
      await this.settlePayment.execute(body.serviceOrderId),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um pagamento por ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async getById(
    @Param() params: PaymentIdParamDto,
  ): Promise<PaymentResponseDto> {
    return toPaymentResponse(await this.getPayment.execute(params.id));
  }
}
