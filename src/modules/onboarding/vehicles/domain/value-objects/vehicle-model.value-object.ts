import { InvalidVehicleModelException } from '@/modules/onboarding/vehicles/domain/exceptions/vehicle.exceptions';

export class VehicleModel {
  private readonly model: string;
  private readonly manufacturer: string;
  private readonly year: number;

  constructor(model: string, manufacturer: string, year: number) {
    if (!model || model.trim().length === 0) {
      throw new InvalidVehicleModelException('model cannot be empty');
    }

    if (!manufacturer || manufacturer.trim().length === 0) {
      throw new InvalidVehicleModelException('manufacturer cannot be empty');
    }

    if (year < 1900 || year > new Date().getFullYear() + 1) {
      throw new InvalidVehicleModelException(
        `year must be between 1900 and ${new Date().getFullYear() + 1}`,
      );
    }

    this.model = model.trim();
    this.manufacturer = manufacturer.trim();
    this.year = year;
  }

  getModel(): string {
    return this.model;
  }

  getManufacturer(): string {
    return this.manufacturer;
  }

  getYear(): number {
    return this.year;
  }

  equals(other: VehicleModel): boolean {
    return (
      this.model === other.getModel() &&
      this.manufacturer === other.getManufacturer() &&
      this.year === other.getYear()
    );
  }

  toString(): string {
    return `${this.manufacturer} ${this.model} (${this.year})`;
  }
}
