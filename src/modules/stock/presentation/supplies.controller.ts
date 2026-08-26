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
import { CreateSupplyUseCase } from '../application/create-supply.usecase';
import { DeleteSupplyUseCase } from '../application/delete-supply.usecase';
import { GetSupplyUseCase } from '../application/get-supply.usecase';
import { ListSuppliesUseCase } from '../application/list-supplies.usecase';
import { LookupStockUseCase } from '../application/lookup-stock.usecase';
import { RegisterStockEntryUseCase } from '../application/register-stock-entry.usecase';
import { ReservePartUseCase } from '../application/reserve-part.usecase';
import { UpdateSupplyUseCase } from '../application/update-supply.usecase';
import {
  RegisterStockEntryDto,
  ReservationResponseDto,
  ReservePartDto,
  StockEntryResponseDto,
  toReservationResponse,
  toStockEntryResponse,
} from './dtos/stock-movement.dtos';
import {
  CreateSupplyDto,
  ListSuppliesQueryDto,
  PaginatedSuppliesResponseDto,
  SupplyIdParamDto,
  SupplyResponseDto,
  SupplyStockResponseDto,
  toSupplyResponse,
  UpdateSupplyDto,
} from './dtos/supply.dtos';
import { SupplyErrorsFilter } from './supply-errors.filter';

@ApiTags('supplies')
@Controller('supplies')
@UseFilters(SupplyErrorsFilter)
export class SuppliesController {
  constructor(
    private readonly createSupply: CreateSupplyUseCase,
    private readonly getSupply: GetSupplyUseCase,
    private readonly listSupplies: ListSuppliesUseCase,
    private readonly updateSupply: UpdateSupplyUseCase,
    private readonly deleteSupply: DeleteSupplyUseCase,
    private readonly registerStockEntry: RegisterStockEntryUseCase,
    private readonly lookupStock: LookupStockUseCase,
    private readonly reservePart: ReservePartUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os supplies do catálogo (paginado)' })
  @ApiResponse({ status: 200, type: PaginatedSuppliesResponseDto })
  async list(
    @Query() query: ListSuppliesQueryDto,
  ): Promise<PaginatedSuppliesResponseDto> {
    const { items, total, page, limit } =
      await this.listSupplies.execute(query);
    return { items: items.map(toSupplyResponse), total, page, limit };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um supply no catálogo' })
  @ApiResponse({ status: 201, type: SupplyResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado' })
  async create(@Body() body: CreateSupplyDto): Promise<SupplyResponseDto> {
    const supply = await this.createSupply.execute(body);
    // A brand new supply has no ledger movements yet, so its balance is zero by
    // construction — no need to query for it.
    return toSupplyResponse({ supply, availableBalance: 0 });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um supply por ID' })
  @ApiResponse({ status: 200, type: SupplyResponseDto })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  async getById(@Param() params: SupplyIdParamDto): Promise<SupplyResponseDto> {
    return toSupplyResponse(await this.getSupply.execute(params.id));
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Consulta o saldo disponível de uma peça' })
  @ApiResponse({ status: 200, type: SupplyStockResponseDto })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  async getStock(
    @Param() params: SupplyIdParamDto,
  ): Promise<SupplyStockResponseDto> {
    return this.lookupStock.execute(params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza parcialmente um supply' })
  @ApiResponse({ status: 200, type: SupplyResponseDto })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado' })
  async update(
    @Param() params: SupplyIdParamDto,
    @Body() body: UpdateSupplyDto,
  ): Promise<SupplyResponseDto> {
    return toSupplyResponse(await this.updateSupply.execute(params.id, body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um supply do catálogo (soft delete)' })
  @ApiResponse({ status: 204, description: 'Supply removido' })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  async remove(@Param() params: SupplyIdParamDto): Promise<void> {
    await this.deleteSupply.execute(params.id);
  }

  @Post(':id/stock-entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra a entrada de peças no estoque' })
  @ApiResponse({ status: 201, type: StockEntryResponseDto })
  @ApiResponse({ status: 400, description: 'Quantidade inválida' })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  async createStockEntry(
    @Param() params: SupplyIdParamDto,
    @Body() body: RegisterStockEntryDto,
  ): Promise<StockEntryResponseDto> {
    const { movement, availableBalance } =
      await this.registerStockEntry.execute({
        supplyId: params.id,
        quantity: body.quantity,
      });
    return toStockEntryResponse(movement, availableBalance);
  }

  @Post(':id/reservations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserva uma quantidade de uma peça para uma OS' })
  @ApiResponse({ status: 201, type: ReservationResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Quantidade ou referência inválida',
  })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  @ApiResponse({ status: 409, description: 'Saldo disponível insuficiente' })
  async createReservation(
    @Param() params: SupplyIdParamDto,
    @Body() body: ReservePartDto,
  ): Promise<ReservationResponseDto> {
    const { movement, availableBalance, reservedQuantity } =
      await this.reservePart.execute({
        supplyId: params.id,
        quantity: body.quantity,
        serviceOrderReference: body.serviceOrderReference,
      });
    return toReservationResponse(movement, availableBalance, reservedQuantity);
  }
}
