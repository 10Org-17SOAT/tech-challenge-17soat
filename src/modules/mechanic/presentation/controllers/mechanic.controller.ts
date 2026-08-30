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
import { CreateMechanicUseCase } from '../../application/use-cases/create-mechanic.use-case';
import { GetMechanicByIdUseCase } from '../../application/use-cases/get-mechanic-by-id.use-case';
import { ListMechanicsUseCase } from '../../application/use-cases/list-mechanics.use-case';
import { UpdateMechanicProfileUseCase } from '../../application/use-cases/update-mechanic-profile.use-case';
import { DeactivateMechanicUseCase } from '../../application/use-cases/deactivate-mechanic.use-case';
import { FindAvailableMechanicUseCase } from '../../application/use-cases/find-available-mechanic.use-case';
import { ReleaseMechanicUseCase } from '../../application/use-cases/release-mechanic.use-case';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  ClaimMechanicDto,
  CreateMechanicDto,
  ListMechanicsQueryDto,
  ReleaseMechanicDto,
  UpdateMechanicDto,
} from '../../infrastructure/schemas/mechanic.schema';
import {
  MechanicIdParamDto,
  MechanicResponseDto,
  PaginatedMechanicsResponseDto,
} from '../dtos/mechanic.dtos';
import { MechanicErrorsFilter } from '../filters/mechanic-errors.filter';
import {
  MechanicResponseDTO,
  PaginatedMechanicsDTO,
} from '../../application/dto/mechanic.dto';

@ApiTags('mechanics')
@Controller('mechanics')
@UseFilters(MechanicErrorsFilter)
export class MechanicController {
  constructor(
    private readonly createMechanic: CreateMechanicUseCase,
    private readonly getMechanicById: GetMechanicByIdUseCase,
    private readonly listMechanics: ListMechanicsUseCase,
    private readonly updateMechanicProfile: UpdateMechanicProfileUseCase,
    private readonly deactivateMechanic: DeactivateMechanicUseCase,
    private readonly findAvailableMechanic: FindAvailableMechanicUseCase,
    private readonly releaseMechanic: ReleaseMechanicUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um mecânico' })
  @ApiResponse({ status: 201, type: MechanicResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 409, description: 'CPF já cadastrado' })
  async create(@Body() body: CreateMechanicDto): Promise<MechanicResponseDTO> {
    return this.createMechanic.execute({
      ...body,
      hireDate: new Date(body.hireDate),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lista mecânicos (paginado, com filtros)' })
  @ApiResponse({ status: 200, type: PaginatedMechanicsResponseDto })
  async list(
    @Query() query: ListMechanicsQueryDto,
  ): Promise<PaginatedMechanicsDTO> {
    return this.listMechanics.execute({
      page: query.page,
      limit: query.limit,
      filters: {
        name: query.name,
        specialty: query.specialty,
        availability: query.availability,
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um mecânico por ID' })
  @ApiResponse({ status: 200, type: MechanicResponseDto })
  @ApiResponse({ status: 404, description: 'Mecânico não encontrado' })
  async getById(
    @Param() params: MechanicIdParamDto,
  ): Promise<MechanicResponseDTO> {
    return this.getMechanicById.execute({ id: params.id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza parcialmente o perfil de um mecânico' })
  @ApiResponse({ status: 200, type: MechanicResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'Mecânico não encontrado' })
  async update(
    @Param() params: MechanicIdParamDto,
    @Body() body: UpdateMechanicDto,
  ): Promise<MechanicResponseDTO> {
    return this.updateMechanicProfile.execute({
      id: params.id,
      data: {
        ...body,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativa um mecânico (soft delete)' })
  @ApiResponse({ status: 204, description: 'Mecânico desativado' })
  @ApiResponse({ status: 404, description: 'Mecânico não encontrado' })
  @ApiResponse({ status: 409, description: 'Mecânico está ALLOCATED' })
  async remove(@Param() params: MechanicIdParamDto): Promise<void> {
    await this.deactivateMechanic.execute({ id: params.id });
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicita um mecânico disponível (claim) para uma service order',
  })
  @ApiResponse({ status: 200, type: MechanicResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'Nenhum mecânico disponível' })
  async claim(@Body() body: ClaimMechanicDto): Promise<MechanicResponseDTO> {
    const mechanic = await this.findAvailableMechanic.execute({
      serviceOrderId: body.serviceOrderId,
      specialty: body.specialty,
    });
    return this.toResponseDTO(mechanic);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Libera um mecânico alocado (release)' })
  @ApiResponse({ status: 200, type: MechanicResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'Mecânico não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Mecânico não está alocado ou service order incorreta',
  })
  async release(
    @Param() params: MechanicIdParamDto,
    @Body() body: ReleaseMechanicDto,
  ): Promise<MechanicResponseDTO> {
    const mechanic = await this.releaseMechanic.execute({
      mechanicId: params.id,
      serviceOrderId: body.serviceOrderId,
    });
    return this.toResponseDTO(mechanic);
  }

  private toResponseDTO(mechanic: Mechanic): MechanicResponseDTO {
    const primitives = mechanic.toPrimitives();
    return {
      id: primitives.id,
      name: primitives.name,
      cpf: primitives.cpf,
      email: primitives.email,
      phone: primitives.phone,
      specialties: primitives.specialties,
      hireDate: primitives.hireDate,
      availability: primitives.availability,
      availableSince: primitives.availableSince,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
