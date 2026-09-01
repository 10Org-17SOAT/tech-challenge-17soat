import {
  Body,
  Controller,
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
import { QuotationErrorsFilter } from '../../quotations/presentation/quotation-errors.filter';
import { toQuotationResponse } from '../../quotations/presentation/dtos/quotation.dtos';
import { StartDiagnosisUseCase } from '../../service-orders/application/start-diagnosis.usecase';
import { ServiceOrderResponseDto } from '../../service-orders/presentation/dtos/service-order.dtos';
import { toServiceOrderResponse } from '../../service-orders/presentation/dtos/service-order.dtos';
import { CompleteDiagnosisUseCase } from '../application/complete-diagnosis.usecase';
import {
  CompleteDiagnosisDto,
  CompleteDiagnosisResponseDto,
  ServiceOrderIdParamDto,
  toDiagnosisResponse,
} from './dtos/diagnosis.dtos';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../auth/roles/role.enum';

@ApiTags('diagnostics')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.MECHANIC)
@Controller('service-orders/:serviceOrderId/diagnosis')
@UseFilters(QuotationErrorsFilter)
export class DiagnosticsController {
  constructor(
    private readonly startDiagnosis: StartDiagnosisUseCase,
    private readonly completeDiagnosis: CompleteDiagnosisUseCase,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia o diagnóstico: a OS vai para in_diagnosis' })
  @ApiResponse({ status: 200, type: ServiceOrderResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({ status: 409, description: 'OS não está em received' })
  async start(
    @Param() params: ServiceOrderIdParamDto,
  ): Promise<ServiceOrderResponseDto> {
    return toServiceOrderResponse(
      await this.startDiagnosis.execute(params.serviceOrderId),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Registra o diagnóstico com os serviços da OS; o orçamento é gerado e a OS vai para awaiting_approval',
  })
  @ApiResponse({ status: 201, type: CompleteDiagnosisResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({ status: 409, description: 'OS não está em in_diagnosis' })
  @ApiResponse({
    status: 422,
    description: 'Serviço ou peça fora do catálogo',
  })
  async complete(
    @Param() params: ServiceOrderIdParamDto,
    @Body() body: CompleteDiagnosisDto,
  ): Promise<CompleteDiagnosisResponseDto> {
    const { diagnosis, quotation } = await this.completeDiagnosis.execute({
      serviceOrderId: params.serviceOrderId,
      findings: body.findings,
      serviceItems: body.serviceItems,
    });
    return {
      diagnosis: toDiagnosisResponse(diagnosis),
      quotation: toQuotationResponse(quotation),
    };
  }
}
