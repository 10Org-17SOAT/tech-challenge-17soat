import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ description: 'License plate of the vehicle' })
  licensePlate!: string;

  @ApiProperty({ description: 'Model of the vehicle' })
  model!: string;

  @ApiProperty({ description: 'Year of manufacture' })
  year!: number;

  @ApiProperty({ description: 'Manufacturer of the vehicle' })
  manufacturer!: string;

  @ApiPropertyOptional({ description: 'Description of the vehicle' })
  description?: string;

  @ApiProperty({ description: 'Color of the vehicle' })
  color!: string;

  @ApiProperty({ description: 'Fuel type of the vehicle' })
  fuelType!: string;

  @ApiProperty({ description: 'Odometer reading' })
  odometer!: number;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({ description: 'Model of the vehicle' })
  model?: string;

  @ApiPropertyOptional({ description: 'Year of manufacture' })
  year?: number;

  @ApiPropertyOptional({ description: 'Manufacturer of the vehicle' })
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Description of the vehicle' })
  description?: string;

  @ApiPropertyOptional({ description: 'Color of the vehicle' })
  color?: string;

  @ApiPropertyOptional({ description: 'Fuel type of the vehicle' })
  fuelType?: string;

  @ApiPropertyOptional({ description: 'Odometer reading' })
  odometer?: number;

  @ApiPropertyOptional({ description: 'Status of the vehicle' })
  status?: string;
}

export class ListVehiclesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  limit: number = 10;
}
