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
  Put,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateServiceUseCase } from '../application/create-service.usecase';
import { DeleteServiceUseCase } from '../application/delete-service.usecase';
import { GetServiceSuppliesUseCase } from '../application/get-service-supplies.usecase';
import { ReplaceServiceSuppliesUseCase } from '../application/replace-service-supplies.usecase';
import { GetServiceUseCase } from '../application/get-service.usecase';
import { ListServicesUseCase } from '../application/list-services.usecase';
import { UpdateServiceUseCase } from '../application/update-service.usecase';
import {
  CreateServiceDto,
  ListServicesQueryDto,
  PaginatedServicesResponseDto,
  ServiceIdParamDto,
  ServiceResponseDto,
  toServiceResponse,
  ReplaceServiceSuppliesDto,
  ServiceSuppliesResponseDto,
  UpdateServiceDto,
} from './dtos/service.dtos';
import { ServiceErrorsFilter } from './service-errors.filter';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../auth/roles/role.enum';

@ApiTags('services')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('services')
@UseFilters(ServiceErrorsFilter)
export class ServicesController {
  constructor(
    private readonly createService: CreateServiceUseCase,
    private readonly getService: GetServiceUseCase,
    private readonly listServices: ListServicesUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly deleteService: DeleteServiceUseCase,
    private readonly getServiceSupplies: GetServiceSuppliesUseCase,
    private readonly replaceServiceSupplies: ReplaceServiceSuppliesUseCase,
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

  @Get(':id/supplies')
  @ApiOperation({
    summary: 'Lista as peças que este serviço consome (lista de materiais)',
  })
  @ApiResponse({ status: 200, type: ServiceSuppliesResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async getSupplies(
    @Param() params: ServiceIdParamDto,
  ): Promise<ServiceSuppliesResponseDto> {
    return { supplies: await this.getServiceSupplies.execute(params.id) };
  }

  @Put(':id/supplies')
  @ApiOperation({
    summary: 'Substitui a lista de materiais do serviço',
  })
  @ApiResponse({ status: 200, type: ServiceSuppliesResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  @ApiResponse({ status: 400, description: 'Peça repetida na lista' })
  async replaceSupplies(
    @Param() params: ServiceIdParamDto,
    @Body() body: ReplaceServiceSuppliesDto,
  ): Promise<ServiceSuppliesResponseDto> {
    return {
      supplies: await this.replaceServiceSupplies.execute(
        params.id,
        body.supplies,
      ),
    };
  }
}
