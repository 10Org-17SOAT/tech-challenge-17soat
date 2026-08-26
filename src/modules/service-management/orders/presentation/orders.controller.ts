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
import { CreateOrderUseCase } from '../application/create-order.usecase';
import { DeleteOrderUseCase } from '../application/delete-order.usecase';
import { GetOrderUseCase } from '../application/get-order.usecase';
import { ListOrdersUseCase } from '../application/list-orders.usecase';
import { UpdateOrderStatusUseCase } from '../application/update-order-status.usecase';
import { UpdateOrderUseCase } from '../application/update-order.usecase';
import {
  CreateOrderDto,
  ListOrdersQueryDto,
  OrderIdParamDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
  toOrderResponse,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from './dtos/order.dtos';
import { OrderErrorsFilter } from './order-errors.filter';

@ApiTags('orders')
@Controller('orders')
@UseFilters(OrderErrorsFilter)
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly updateOrder: UpdateOrderUseCase,
    private readonly updateOrderStatus: UpdateOrderStatusUseCase,
    private readonly deleteOrder: DeleteOrderUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista as OSs (paginado, filtro por status)' })
  @ApiResponse({ status: 200, type: PaginatedOrdersResponseDto })
  async list(
    @Query() query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const { items, total, page, limit } = await this.listOrders.execute(query);
    return { items: items.map(toOrderResponse), total, page, limit };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abre uma OS em status received' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async create(@Body() body: CreateOrderDto): Promise<OrderResponseDto> {
    const order = await this.createOrder.execute(body);
    return toOrderResponse(order);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma OS por ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async getById(@Param() params: OrderIdParamDto): Promise<OrderResponseDto> {
    const order = await this.getOrder.execute(params.id);
    return toOrderResponse(order);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza campos editoriais da OS' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  async update(
    @Param() params: OrderIdParamDto,
    @Body() body: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.updateOrder.execute(params.id, body);
    return toOrderResponse(order);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Avança o status da OS conforme a máquina de estados',
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'OS não encontrada' })
  @ApiResponse({ status: 409, description: 'Transição inválida' })
  async transition(
    @Param() params: OrderIdParamDto,
    @Body() body: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.updateOrderStatus.execute(params.id, body.status);
    return toOrderResponse(order);
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
  async remove(@Param() params: OrderIdParamDto): Promise<void> {
    await this.deleteOrder.execute(params.id);
  }
}
