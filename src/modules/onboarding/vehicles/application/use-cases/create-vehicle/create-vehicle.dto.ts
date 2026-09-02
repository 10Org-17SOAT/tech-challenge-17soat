export interface CreateVehicleInput {
  customerId: string;
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
  vehicle_id: string;
  customerId: string;
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description: string | null;
  color: string;
  fuelType: string;
  odometer: number;
}
