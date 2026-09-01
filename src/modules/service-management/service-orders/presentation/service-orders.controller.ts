import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DeleteServiceOrderUseCase } from '../application/delete-service-order.usecase';
import { GetAverageExecutionTimeUseCase } from '../application/get-average-execution-time.usecase';
import { GetServiceOrderStatusUseCase } from '../application/get-service-order-status.usecase';
import { GetServiceOrderUseCase } from '../application/get-service-order.usecase';
import { ListServiceOrdersUseCase } from '../application/list-service-orders.usecase';
import { UpdateServiceOrderUseCase } from '../application/update-service-order.usecase';
import {
  AverageExecutionTimeQueryDto,
  AverageExecutionTimeResponseDto,
  ListServiceOrdersQueryDto,
  ServiceOrderIdParamDto,
  ServiceOrderResponseDto,
  ServiceOrderStatusResponseDto,
  PaginatedServiceOrdersResponseDto,
  toServiceOrderResponse,
  UpdateServiceOrderDto,
} from './dtos/service-order.dtos';
import { ServiceOrderErrorsFilter } from './service-order-errors.filter';
import { Roles, UserRole } from '../../../auth/public/roles';
import { CurrentUser } from '../../../auth/public/current-user';
import type { AuthenticatedUser } from '../../../auth/public/current-user';

@ApiTags('service-orders')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('service-orders')
@UseFilters(ServiceOrderErrorsFilter)
export class ServiceOrdersController {
  constructor(
    private readonly getOrder: GetServiceOrderUseCase,
    private readonly getOrderStatus: GetServiceOrderStatusUseCase,
    private readonly listOrders: ListServiceOrdersUseCase,
    private readonly updateOrder: UpdateServiceOrderUseCase,
    private readonly deleteOrder: DeleteServiceOrderUseCase,
    private readonly getAverageExecutionTime: GetAverageExecutionTimeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista as OSs (paginado, filtro por status)' })
  @ApiResponse({ status: 200, type: PaginatedServiceOrdersResponseDto })
  async list(
    @Query() query: ListServiceOrdersQueryDto,
  ): Promise<PaginatedServiceOrdersResponseDto> {
    const { items, total, page, limit } = await this.listOrders.execute(query);
    return { items: items.map(toServiceOrderResponse), total, page, limit };
  }

  // Declared above `@Get(':id')` on purpose: Nest matches routes in
  // declaration order, so moving this below would make the literal path fall
  // into `getById` and fail the UUID check with a 400. The e2e test pins it.
  @Get('average-execution-time')
  @ApiOperation({
    summary: 'Tempo médio de execução das OSs finalizadas',
    description:
      'Média entre a entrada em in_execution (startedAt) e a finalização ' +
      '(completedAt). Não inclui a espera por diagnóstico nem pela aprovação ' +
      'do cliente. A janela from/to recorta por completedAt.',
  })
  @ApiResponse({ status: 200, type: AverageExecutionTimeResponseDto })
  @ApiResponse({ status: 400, description: '"from" posterior a "to"' })
  async averageExecutionTime(
    @Query() query: AverageExecutionTimeQueryDto,
  ): Promise<AverageExecutionTimeResponseDto> {
    return this.getAverageExecutionTime.execute(query);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma OS por ID' })
  @ApiResponse({ status: 200, type: ServiceOrderResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async getById(
    @Param() params: ServiceOrderIdParamDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.getOrder.execute(params.id);
    return toServiceOrderResponse(order);
  }

  // Exception to the controller-level ADMIN rule: checking the status of an
  // order is the single endpoint a customer is allowed to reach.
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER)
  @Get(':id/status')
  @ApiOperation({ summary: 'Consulta o status atual de uma OS' })
  @ApiResponse({ status: 200, type: ServiceOrderStatusResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async getStatus(
    @Param() params: ServiceOrderIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ServiceOrderStatusResponseDto> {
    // A customer only sees their own order; an admin sees any. Passing the
    // requester is what narrows the use case, so the role check stays here and
    // the ownership rule stays in the application layer.
    const requesterUserId =
      user.role_id === UserRole.CUSTOMER ? user.user_id : undefined;

    const status = await this.getOrderStatus.execute(
      params.id,
      requesterUserId,
    );
    return { status };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza campos editoriais da OS' })
  @ApiResponse({ status: 200, type: ServiceOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async update(
    @Param() params: ServiceOrderIdParamDto,
    @Body() body: UpdateServiceOrderDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.updateOrder.execute(params.id, body);
    return toServiceOrderResponse(order);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove uma OS em status received (soft delete)',
  })
  @ApiResponse({ status: 204, description: 'OS removida' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'OS não pode ser removida no status atual',
  })
  async remove(@Param() params: ServiceOrderIdParamDto): Promise<void> {
    await this.deleteOrder.execute(params.id);
  }
}
