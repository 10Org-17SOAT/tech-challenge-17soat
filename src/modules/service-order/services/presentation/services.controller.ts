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
import { CreateServiceUseCase } from '@/modules/service-order/services/application/create-service.usecase';
import { DeleteServiceUseCase } from '@/modules/service-order/services/application/delete-service.usecase';
import { GetServiceUseCase } from '@/modules/service-order/services/application/get-service.usecase';
import { ListServicesUseCase } from '@/modules/service-order/services/application/list-services.usecase';
import { UpdateServiceUseCase } from '@/modules/service-order/services/application/update-service.usecase';
import {
  CreateServiceDto,
  ListServicesQueryDto,
  PaginatedServicesResponseDto,
  ServiceIdParamDto,
  ServiceResponseDto,
  toServiceResponse,
  UpdateServiceDto,
} from '@/modules/service-order/services/presentation/dtos/service.dtos';
import { ServiceErrorsFilter } from '@/modules/service-order/services/presentation/service-errors.filter';

@ApiTags('services')
@Controller('services')
@UseFilters(ServiceErrorsFilter)
export class ServicesController {
  constructor(
    private readonly createService: CreateServiceUseCase,
    private readonly getService: GetServiceUseCase,
    private readonly listServices: ListServicesUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly deleteService: DeleteServiceUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os serviços do catálogo (paginado)' })
  @ApiResponse({ status: 200, type: PaginatedServicesResponseDto })
  async list(
    @Query() query: ListServicesQueryDto,
  ): Promise<PaginatedServicesResponseDto> {
    const { items, total, page, limit } =
      await this.listServices.execute(query);
    return { items: items.map(toServiceResponse), total, page, limit };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um serviço no catálogo' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado' })
  async create(@Body() body: CreateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.createService.execute(body);
    return toServiceResponse(service);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um serviço por ID' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async getById(
    @Param() params: ServiceIdParamDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.getService.execute(params.id);
    return toServiceResponse(service);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza parcialmente um serviço' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado' })
  async update(
    @Param() params: ServiceIdParamDto,
    @Body() body: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.updateService.execute(params.id, body);
    return toServiceResponse(service);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um serviço do catálogo (soft delete)' })
  @ApiResponse({ status: 204, description: 'Serviço removido' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async remove(@Param() params: ServiceIdParamDto): Promise<void> {
    await this.deleteService.execute(params.id);
  }
}
