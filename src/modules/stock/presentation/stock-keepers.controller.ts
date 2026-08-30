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
import { CreateStockKeeperUseCase } from '../application/create-stock-keeper.usecase';
import { DeleteStockKeeperUseCase } from '../application/delete-stock-keeper.usecase';
import { GetStockKeeperUseCase } from '../application/get-stock-keeper.usecase';
import { ListStockKeepersUseCase } from '../application/list-stock-keepers.usecase';
import { UpdateStockKeeperUseCase } from '../application/update-stock-keeper.usecase';
import {
  CreateStockKeeperDto,
  ListStockKeepersQueryDto,
  PaginatedStockKeepersResponseDto,
  StockKeeperIdParamDto,
  StockKeeperResponseDto,
  toStockKeeperResponse,
  UpdateStockKeeperDto,
} from './dtos/stock-keeper.dtos';
import { SupplyErrorsFilter } from './supply-errors.filter';

@ApiTags('stock-keepers')
@Controller('stock-keepers')
@UseFilters(SupplyErrorsFilter)
export class StockKeepersController {
  constructor(
    private readonly createStockKeeper: CreateStockKeeperUseCase,
    private readonly getStockKeeper: GetStockKeeperUseCase,
    private readonly listStockKeepers: ListStockKeepersUseCase,
    private readonly updateStockKeeper: UpdateStockKeeperUseCase,
    private readonly deleteStockKeeper: DeleteStockKeeperUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os estoquistas (paginado)' })
  @ApiResponse({ status: 200, type: PaginatedStockKeepersResponseDto })
  async list(
    @Query() query: ListStockKeepersQueryDto,
  ): Promise<PaginatedStockKeepersResponseDto> {
    const { items, total, page, limit } =
      await this.listStockKeepers.execute(query);
    return { items: items.map(toStockKeeperResponse), total, page, limit };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um estoquista' })
  @ApiResponse({ status: 201, type: StockKeeperResponseDto })
  @ApiResponse({ status: 409, description: 'CPF já cadastrado' })
  async create(
    @Body() body: CreateStockKeeperDto,
  ): Promise<StockKeeperResponseDto> {
    return toStockKeeperResponse(await this.createStockKeeper.execute(body));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um estoquista por ID' })
  @ApiResponse({ status: 200, type: StockKeeperResponseDto })
  @ApiResponse({ status: 404, description: 'Estoquista não encontrado' })
  async getById(
    @Param() params: StockKeeperIdParamDto,
  ): Promise<StockKeeperResponseDto> {
    return toStockKeeperResponse(
      await this.getStockKeeper.execute(params.id),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza parcialmente um estoquista' })
  @ApiResponse({ status: 200, type: StockKeeperResponseDto })
  @ApiResponse({ status: 404, description: 'Estoquista não encontrado' })
  async update(
    @Param() params: StockKeeperIdParamDto,
    @Body() body: UpdateStockKeeperDto,
  ): Promise<StockKeeperResponseDto> {
    return toStockKeeperResponse(
      await this.updateStockKeeper.execute(params.id, body),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um estoquista (soft delete)' })
  @ApiResponse({ status: 204, description: 'Estoquista removido' })
  @ApiResponse({ status: 404, description: 'Estoquista não encontrado' })
  async remove(@Param() params: StockKeeperIdParamDto): Promise<void> {
    await this.deleteStockKeeper.execute(params.id);
  }
}
