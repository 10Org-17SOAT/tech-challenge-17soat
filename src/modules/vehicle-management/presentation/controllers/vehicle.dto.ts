export class CreateVehicleDto {
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description?: string;
  color: string;
  fuelType: string;
  odometer: number;
}

export class UpdateVehicleDto {
  model?: string;
  year?: number;
  manufacturer?: string;
  description?: string;
  color?: string;
  fuelType?: string;
  odometer?: number;
  status?: string;
}

export class ListVehiclesQueryDto {
  page: number = 1;
  limit: number = 10;
}
