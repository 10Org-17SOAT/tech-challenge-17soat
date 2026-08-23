import {
  VehicleId,
  LicensePlate,
  VehicleModel,
  VehicleColor,
  FuelType,
  Odometer,
} from '../value-objects';
import { VehicleException } from '../exceptions/vehicle.exceptions';

export interface CreateVehicleProps {
  vehicle_id?: string;
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description?: string;
  color: string;
  fuelType: string;
  odometer: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface UpdateVehicleProps {
  model?: string;
  year?: number;
  manufacturer?: string;
  description?: string;
  color?: string;
  fuelType?: string;
  odometer?: number;
}

export class Vehicle {
  private readonly vehicle_id: VehicleId;
  private licensePlate: LicensePlate;
  private vehicleModel: VehicleModel;
  private description: string | null;
  private color: VehicleColor;
  private fuelType: FuelType;
  private odometer: Odometer;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private deletedAt: Date | null;

  constructor(props: CreateVehicleProps) {
    this.vehicle_id = new VehicleId(props.vehicle_id);
    this.licensePlate = new LicensePlate(props.licensePlate);
    this.vehicleModel = new VehicleModel(
      props.model,
      props.manufacturer,
      props.year,
    );
    this.description = props.description || null;
    this.color = new VehicleColor(props.color);
    this.fuelType = new FuelType(props.fuelType);
    this.odometer = new Odometer(props.odometer);
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.deletedAt = props.deletedAt || null;
  }

  static create(props: CreateVehicleProps): Vehicle {
    return new Vehicle(props);
  }

  getId(): VehicleId {
    return this.vehicle_id;
  }

  getLicensePlate(): LicensePlate {
    return this.licensePlate;
  }

  getVehicleModel(): VehicleModel {
    return this.vehicleModel;
  }

  getDescription(): string | null {
    return this.description;
  }

  getColor(): VehicleColor {
    return this.color;
  }

  getFuelType(): FuelType {
    return this.fuelType;
  }

  getOdometer(): Odometer {
    return this.odometer;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | null {
    return this.deletedAt;
  }

  // The value objects raise the domain exceptions themselves, so no try/catch
  // here: a failed validation must propagate and reach the controller as a 400.
  updateVehicleInfo(props: UpdateVehicleProps): void {
    if (props.model || props.manufacturer || props.year) {
      this.vehicleModel = new VehicleModel(
        props.model || this.vehicleModel.getModel(),
        props.manufacturer || this.vehicleModel.getManufacturer(),
        props.year || this.vehicleModel.getYear(),
      );
    }

    if (props.description !== undefined) {
      this.description = props.description || null;
    }

    if (props.color) {
      this.color = new VehicleColor(props.color);
    }

    if (props.fuelType) {
      this.fuelType = new FuelType(props.fuelType);
    }

    if (props.odometer !== undefined) {
      this.odometer = new Odometer(props.odometer);
    }

    this.updatedAt = new Date();
  }

  incrementOdometer(kilometers: number): void {
    this.odometer = this.odometer.increment(kilometers);
    this.updatedAt = new Date();
  }

  equals(other: Vehicle): boolean {
    return this.vehicle_id.equals(other.getId());
  }

  toPrimitives() {
    return {
      vehicle_id: this.vehicle_id.getValue(),
      licensePlate: this.licensePlate.getValue(),
      model: this.vehicleModel.getModel(),
      year: this.vehicleModel.getYear(),
      manufacturer: this.vehicleModel.getManufacturer(),
      description: this.description,
      color: this.color.getValue(),
      fuelType: this.fuelType.getValue(),
      odometer: this.odometer.getValue(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  delete(): void {
    if (this.deletedAt !== null) {
      throw new VehicleException('Vehicle is already deleted');
    }

    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
