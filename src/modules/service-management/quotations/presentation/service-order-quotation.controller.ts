import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetServiceOrderQuotationUseCase } from '../application/get-service-order-quotation.usecase';
import {
  QuotationResponseDto,
  ServiceOrderIdParamDto,
  toQuotationResponse,
} from './dtos/quotation.dtos';
import { QuotationErrorsFilter } from './quotation-errors.filter';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../auth/roles/role.enum';

@ApiTags('quotations')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('service-orders/:serviceOrderId/quotation')
@UseFilters(QuotationErrorsFilter)
export class ServiceOrderQuotationController {
  constructor(
    private readonly getServiceOrderQuotation: GetServiceOrderQuotationUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Consulta o orçamento de uma OS' })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @ApiResponse({ status: 404, description: 'OS sem orçamento emitido' })
  async get(
    @Param() params: ServiceOrderIdParamDto,
  ): Promise<QuotationResponseDto> {
    return toQuotationResponse(
      await this.getServiceOrderQuotation.execute(params.serviceOrderId),
    );
  }
}
