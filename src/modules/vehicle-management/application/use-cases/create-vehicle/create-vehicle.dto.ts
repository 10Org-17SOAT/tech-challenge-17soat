export interface CreateVehicleInput {
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description?: string;
  color: string;
  fuelType: string;
  odometer: number;
}

export interface CreateVehicleOutput {
  id: string;
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description: string | null;
  color: string;
  fuelType: string;
  odometer: number;
  status: string;
}
