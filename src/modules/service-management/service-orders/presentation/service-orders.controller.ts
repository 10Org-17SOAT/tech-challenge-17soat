import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateServiceOrderUseCase } from '../application/create-service-order.usecase';
import { DeleteServiceOrderUseCase } from '../application/delete-service-order.usecase';
import { GetServiceOrderStatusUseCase } from '../application/get-service-order-status.usecase';
import { GetServiceOrderUseCase } from '../application/get-service-order.usecase';
import { ListServiceOrdersUseCase } from '../application/list-service-orders.usecase';
import { UpdateServiceOrderUseCase } from '../application/update-service-order.usecase';
import {
  CreateServiceOrderDto,
  ListServiceOrdersQueryDto,
  ServiceOrderIdParamDto,
  ServiceOrderResponseDto,
  ServiceOrderStatusResponseDto,
  PaginatedServiceOrdersResponseDto,
  toServiceOrderResponse,
  UpdateServiceOrderDto,
} from './dtos/service-order.dtos';
import { ServiceOrderErrorsFilter } from './service-order-errors.filter';

@ApiTags('service-orders')
@Controller('service-orders')
@UseFilters(ServiceOrderErrorsFilter)
export class ServiceOrdersController {
  constructor(
    private readonly createOrder: CreateServiceOrderUseCase,
    private readonly getOrder: GetServiceOrderUseCase,
    private readonly getOrderStatus: GetServiceOrderStatusUseCase,
    private readonly listOrders: ListServiceOrdersUseCase,
    private readonly updateOrder: UpdateServiceOrderUseCase,
    private readonly deleteOrder: DeleteServiceOrderUseCase,
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abre uma OS em status received' })
  @ApiResponse({ status: 201, type: ServiceOrderResponseDto })
  async create(@Body() body: CreateServiceOrderDto): Promise<ServiceOrderResponseDto> {
    const order = await this.createOrder.execute(body);
    return toServiceOrderResponse(order);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma OS por ID' })
  @ApiResponse({ status: 200, type: ServiceOrderResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async getById(@Param() params: ServiceOrderIdParamDto): Promise<ServiceOrderResponseDto> {
    const order = await this.getOrder.execute(params.id);
    return toServiceOrderResponse(order);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Consulta o status atual de uma OS' })
  @ApiResponse({ status: 200, type: ServiceOrderStatusResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async getStatus(
    @Param() params: ServiceOrderIdParamDto,
  ): Promise<ServiceOrderStatusResponseDto> {
    const status = await this.getOrderStatus.execute(params.id);
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
