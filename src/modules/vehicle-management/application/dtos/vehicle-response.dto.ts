export class VehicleResponseDto {
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
  deletedAt: Date | null;

  constructor(data: {
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
    deletedAt?: Date | null;
  }) {
    this.id = data.id;
    this.licensePlate = data.licensePlate;
    this.model = data.model;
    this.year = data.year;
    this.manufacturer = data.manufacturer;
    this.description = data.description;
    this.color = data.color;
    this.fuelType = data.fuelType;
    this.odometer = data.odometer;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt || null;
  }
}
