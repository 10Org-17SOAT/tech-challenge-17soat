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
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateAnamnesisUseCase } from '../application/create-anamnesis.usecase';
import { DeleteAnamnesisUseCase } from '../application/delete-anamnesis.usecase';
import { GetAnamnesisUseCase } from '../application/get-anamnesis.usecase';
import { UpdateAnamnesisUseCase } from '../application/update-anamnesis.usecase';
import { AnamnesisErrorsFilter } from './anamnesis-errors.filter';
import {
  AnamnesisResponseDto,
  CreateAnamnesisDto,
  ServiceOrderIdParamDto,
  UpdateAnamnesisDto,
  toAnamnesisResponse,
} from './dtos/anamnesis.dtos';

@ApiTags('anamnesis')
@Controller()
@UseFilters(AnamnesisErrorsFilter)
export class AnamnesisController {
  constructor(
    private readonly createAnamnesis: CreateAnamnesisUseCase,
    private readonly getAnamnesis: GetAnamnesisUseCase,
    private readonly updateAnamnesis: UpdateAnamnesisUseCase,
    private readonly deleteAnamnesis: DeleteAnamnesisUseCase,
  ) {}

  @Post('service-order/anamnesis')
@Post('service-order/anamnesis')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Cria a anamnese e abre a OS em received com a anamnese atrelada',
  })
  @ApiResponse({ status: 201, type: AnamnesisResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 422, description: 'Veículo não encontrado' })
  async create(
    @Body() body: CreateAnamnesisDto,
  ): Promise<AnamnesisResponseDto> {
    const { anamnesis, vehicleId } = await this.createAnamnesis.execute(body);
    return toAnamnesisResponse(anamnesis, vehicleId);
  }

  @Get('service-orders/:serviceOrderId/anamnesis')
  @ApiOperation({ summary: 'Consulta a anamnese de uma OS' })
  @ApiResponse({ status: 200, type: AnamnesisResponseDto })
  @ApiResponse({ status: 404, description: 'OS ou anamnese não encontrada' })
  async get(
    @Param() params: ServiceOrderIdParamDto,
  ): Promise<AnamnesisResponseDto> {
    const { anamnesis, vehicleId } = await this.getAnamnesis.execute(
      params.serviceOrderId,
    );
    return toAnamnesisResponse(anamnesis, vehicleId);
  }

  @Patch('service-orders/:serviceOrderId/anamnesis')
  @ApiOperation({
    summary: 'Atualiza a anamnese enquanto a OS está em received',
  })
  @ApiResponse({ status: 200, type: AnamnesisResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'OS ou anamnese não encontrada' })
  @ApiResponse({ status: 409, description: 'Anamnese bloqueada no status atual' })
  async update(
    @Param() params: ServiceOrderIdParamDto,
    @Body() body: UpdateAnamnesisDto,
  ): Promise<AnamnesisResponseDto> {
    const { updatedBy, ...changes } = body;
    const { anamnesis, vehicleId } = await this.updateAnamnesis.execute(
      params.serviceOrderId,
      changes,
      updatedBy,
    );
    return toAnamnesisResponse(anamnesis, vehicleId);
  }

  @Delete('service-orders/:serviceOrderId/anamnesis')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a anamnese (soft delete) enquanto a OS está em received',
  })
  @ApiResponse({ status: 204, description: 'Anamnese removida' })
  @ApiResponse({ status: 404, description: 'OS ou anamnese não encontrada' })
  @ApiResponse({ status: 409, description: 'Anamnese bloqueada no status atual' })
  async remove(@Param() params: ServiceOrderIdParamDto): Promise<void> {
    await this.deleteAnamnesis.execute(params.serviceOrderId);
  }
}