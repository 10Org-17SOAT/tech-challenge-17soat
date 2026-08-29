import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateVehicleUseCase } from '@/modules/onboarding/vehicles/application/use-cases/create-vehicle/create-vehicle.use-case';
import { FindVehicleByIdUseCase } from '@/modules/onboarding/vehicles/application/use-cases/find-vehicle-by-id/find-vehicle-by-id.use-case';
import { ListVehiclesUseCase } from '@/modules/onboarding/vehicles/application/use-cases/list-vehicles/list-vehicles.use-case';
import { UpdateVehicleUseCase } from '@/modules/onboarding/vehicles/application/use-cases/update-vehicle/update-vehicle.use-case';
import { DeleteVehicleUseCase } from '@/modules/onboarding/vehicles/application/use-cases/delete-vehicle/delete-vehicle.use-case';
import { VehicleResponseDto } from '@/modules/onboarding/vehicles/application/dtos/vehicle-response.dto';
import { VehicleMapper } from '@/modules/onboarding/vehicles/infrastructure/mappers/vehicle.mapper';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  UpdateVehicleDto,
} from '@/modules/onboarding/vehicles/presentation/dtos/vehicle.dtos';
import { VehicleErrorsFilter } from '@/modules/onboarding/vehicles/presentation/filters/vehicle-errors.filter';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseFilters(VehicleErrorsFilter)
export class VehicleController {
  constructor(
    private readonly createVehicleUseCase: CreateVehicleUseCase,
    private readonly findVehicleByIdUseCase: FindVehicleByIdUseCase,
    private readonly listVehiclesUseCase: ListVehiclesUseCase,
    private readonly updateVehicleUseCase: UpdateVehicleUseCase,
    private readonly deleteVehicleUseCase: DeleteVehicleUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({
    status: 201,
    description: 'Vehicle created successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'License plate already exists' })
  async create(
    @Body() createVehicleDto: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const result = await this.createVehicleUseCase.execute(createVehicleDto);
    return new VehicleResponseDto({
      vehicle_id: result.vehicle_id,
      licensePlate: result.licensePlate,
      model: result.model,
      year: result.year,
      manufacturer: result.manufacturer,
      description: result.description,
      color: result.color,
      fuelType: result.fuelType,
      odometer: result.odometer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @Get(':vehicleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle found',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findById(@Param('vehicleId') id: string): Promise<VehicleResponseDto> {
    // The use case throws VehicleNotFoundException when there is no match,
    // so the filter is what turns a missing vehicle into a 404.
    const vehicle = await this.findVehicleByIdUseCase.execute(id);
    return VehicleMapper.toResponse(vehicle!);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all vehicles with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Vehicles listed successfully',
  })
  async findAll(@Query() query: ListVehiclesQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.listVehiclesUseCase.execute({
      page: Math.max(1, page),
      limit: Math.max(1, Math.min(100, limit)),
    });

    return {
      data: result.data.map(
        (item) =>
          new VehicleResponseDto({
            vehicle_id: item.vehicle_id,
            licensePlate: item.licensePlate,
            model: item.model,
            year: item.year,
            manufacturer: item.manufacturer,
            description: item.description,
            color: item.color,
            fuelType: item.fuelType,
            odometer: item.odometer,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }),
      ),
      pagination: result.pagination,
    };
  }

  @Patch(':vehicleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle updated successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async update(
    @Param('vehicleId') vehicle_id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const result = await this.updateVehicleUseCase.execute({
      vehicle_id,
      ...updateVehicleDto,
    });
    return new VehicleResponseDto({
      vehicle_id: result.vehicle_id,
      licensePlate: result.licensePlate,
      model: result.model,
      year: result.year,
      manufacturer: result.manufacturer,
      description: result.description,
      color: result.color,
      fuelType: result.fuelType,
      odometer: result.odometer,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  }

  @Delete(':vehicleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete vehicle (soft delete)' })
  @ApiResponse({ status: 204, description: 'Vehicle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async delete(@Param('vehicleId') id: string): Promise<void> {
    await this.deleteVehicleUseCase.execute(id);
  }
}
