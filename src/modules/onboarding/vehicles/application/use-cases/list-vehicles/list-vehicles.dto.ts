export interface ListVehiclesInput {
  page: number;
  limit: number;
}

export interface ListVehiclesOutput {
  data: Array<{
    vehicle_id: string;
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
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
