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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateConsultantUseCase } from '../application/create-consultant.usecase';
import { DeleteConsultantUseCase } from '../application/delete-consultant.usecase';
import { GetConsultantUseCase } from '../application/get-consultant.usecase';
import { ListConsultantsUseCase } from '../application/list-consultants.usecase';
import { UpdateConsultantUseCase } from '../application/update-consultant.usecase';
import {
  ConsultantIdParamDto,
  ConsultantResponseDto,
  CreateConsultantDto,
  ListConsultantsQueryDto,
  PaginatedConsultantsResponseDto,
  toConsultantResponse,
  UpdateConsultantDto,
} from './dtos/consultant.dtos';
import { ConsultantErrorsFilter } from './consultant-errors.filter';
import { Roles, UserRole } from '../../../auth/public/roles';

@ApiTags('consultants')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('consultants')
@UseFilters(ConsultantErrorsFilter)
export class ConsultantsController {
  constructor(
    private readonly createConsultant: CreateConsultantUseCase,
    private readonly getConsultant: GetConsultantUseCase,
    private readonly listConsultants: ListConsultantsUseCase,
    private readonly updateConsultant: UpdateConsultantUseCase,
    private readonly deleteConsultant: DeleteConsultantUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os consultores (paginado)' })
  @ApiResponse({ status: 200, type: PaginatedConsultantsResponseDto })
  async list(
    @Query() query: ListConsultantsQueryDto,
  ): Promise<PaginatedConsultantsResponseDto> {
    const { items, total, page, limit } =
      await this.listConsultants.execute(query);
    return { items: items.map(toConsultantResponse), total, page, limit };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um consultor' })
  @ApiResponse({ status: 201, type: ConsultantResponseDto })
  @ApiResponse({ status: 409, description: 'CPF já cadastrado' })
  async create(
    @Body() body: CreateConsultantDto,
  ): Promise<ConsultantResponseDto> {
    return toConsultantResponse(await this.createConsultant.execute(body));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um consultor por ID' })
  @ApiResponse({ status: 200, type: ConsultantResponseDto })
  @ApiResponse({ status: 404, description: 'Consultor não encontrado' })
  async getById(
    @Param() params: ConsultantIdParamDto,
  ): Promise<ConsultantResponseDto> {
    return toConsultantResponse(await this.getConsultant.execute(params.id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza parcialmente um consultor' })
  @ApiResponse({ status: 200, type: ConsultantResponseDto })
  @ApiResponse({ status: 404, description: 'Consultor não encontrado' })
  async update(
    @Param() params: ConsultantIdParamDto,
    @Body() body: UpdateConsultantDto,
  ): Promise<ConsultantResponseDto> {
    return toConsultantResponse(
      await this.updateConsultant.execute(params.id, body),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um consultor (soft delete)' })
  @ApiResponse({ status: 204, description: 'Consultor removido' })
  @ApiResponse({ status: 404, description: 'Consultor não encontrado' })
  async remove(@Param() params: ConsultantIdParamDto): Promise<void> {
    await this.deleteConsultant.execute(params.id);
  }
}
