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
import { UpdateSupplyUseCase } from '../application/update-supply.usecase';
import {
  CreateSupplyDto,
  ListSuppliesQueryDto,
  PaginatedSuppliesResponseDto,
  SupplyIdParamDto,
  SupplyResponseDto,
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
    return toSupplyResponse(supply);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um supply por ID' })
  @ApiResponse({ status: 200, type: SupplyResponseDto })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  async getById(@Param() params: SupplyIdParamDto): Promise<SupplyResponseDto> {
    const supply = await this.getSupply.execute(params.id);
    return toSupplyResponse(supply);
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
    const supply = await this.updateSupply.execute(params.id, body);
    return toSupplyResponse(supply);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um supply do catálogo (soft delete)' })
  @ApiResponse({ status: 204, description: 'Supply removido' })
  @ApiResponse({ status: 404, description: 'Supply não encontrado' })
  async remove(@Param() params: SupplyIdParamDto): Promise<void> {
    await this.deleteSupply.execute(params.id);
  }
}
