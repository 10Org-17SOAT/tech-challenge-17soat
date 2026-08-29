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
import { CreateCustomerUseCase } from '@/modules/onboarding/customer/application/use-cases/create-customer.use-case';
import { FindCustomerByIdUseCase } from '@/modules/onboarding/customer/application/use-cases/find-customer-by-id.use-case';
import { FindAllCustomersUseCase } from '@/modules/onboarding/customer/application/use-cases/find-all-customers.use-case';
import { UpdateCustomerUseCase } from '@/modules/onboarding/customer/application/use-cases/update-customer.use-case';
import { SoftDeleteCustomerUseCase } from '@/modules/onboarding/customer/application/use-cases/soft-delete-customer.use-case';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from '@/modules/onboarding/customer/infrastructure/schemas/customer.schema';
import {
  CustomerIdParamDto,
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from '@/modules/onboarding/customer/presentation/dtos/customer.dtos';
import { CustomerErrorsFilter } from '@/modules/onboarding/customer/presentation/filters/customer-errors.filter';
import {
  CustomerResponseDTO,
  PaginatedCustomersDTO,
} from '@/modules/onboarding/customer/application/dto/customer.dto';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';

@ApiTags('customers')
@Controller('customers')
@UseFilters(CustomerErrorsFilter)
export class CustomerController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly findCustomerById: FindCustomerByIdUseCase,
    private readonly findAllCustomers: FindAllCustomersUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly softDeleteCustomer: SoftDeleteCustomerUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um cliente (PF ou PJ)' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 409, description: 'Documento já cadastrado' })
  async create(@Body() body: CreateCustomerDto): Promise<CustomerResponseDTO> {
    return this.createCustomer.execute({
      ...body,
      personType: PersonType[body.personType],
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lista clientes (paginado, com filtros)' })
  @ApiResponse({ status: 200, type: PaginatedCustomersResponseDto })
  async list(
    @Query() query: ListCustomersQueryDto,
  ): Promise<PaginatedCustomersDTO> {
    return this.findAllCustomers.execute({
      page: query.page,
      limit: query.limit,
      filters: {
        personType: query.personType ? PersonType[query.personType] : undefined,
        name: query.name,
        document: query.document,
        email: query.email,
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um cliente por ID' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async getById(
    @Param() params: CustomerIdParamDto,
  ): Promise<CustomerResponseDTO> {
    return this.findCustomerById.execute({ id: params.id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza parcialmente um cliente' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 409, description: 'Documento já cadastrado' })
  async update(
    @Param() params: CustomerIdParamDto,
    @Body() body: UpdateCustomerDto,
  ): Promise<CustomerResponseDTO> {
    return this.updateCustomer.execute({ id: params.id, data: body });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um cliente (soft delete)' })
  @ApiResponse({ status: 204, description: 'Cliente removido' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async remove(@Param() params: CustomerIdParamDto): Promise<void> {
    await this.softDeleteCustomer.execute({ id: params.id });
  }
}
