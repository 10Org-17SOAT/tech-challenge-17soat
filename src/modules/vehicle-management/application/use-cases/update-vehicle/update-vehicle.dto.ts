export interface UpdateVehicleInput {
  id: string;
  model?: string;
  year?: number;
  manufacturer?: string;
  description?: string;
  color?: string;
  fuelType?: string;
  odometer?: number;
}

export interface UpdateVehicleOutput {
  id: string;
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description: string | null;
  color: string;
  fuelType: string;
  odometer: number;
  createdAt: Date;
  updatedAt: Date;
}
