import {
  VehicleId,
  LicensePlate,
  VehicleModel,
  VehicleColor,
  FuelType,
  Odometer,
  VehicleStatus,
} from '../value-objects';
import {
  VehicleException,
  InvalidVehicleStatusException,
} from '../exceptions/vehicle.exceptions';

export interface CreateVehicleProps {
  id?: string;
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description?: string;
  color: string;
  fuelType: string;
  odometer: number;
  status?: string;
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
  status?: string;
}

export class Vehicle {
  private readonly id: VehicleId;
  private licensePlate: LicensePlate;
  private vehicleModel: VehicleModel;
  private description: string | null;
  private color: VehicleColor;
  private fuelType: FuelType;
  private odometer: Odometer;
  private status: VehicleStatus;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private deletedAt: Date | null;

  constructor(props: CreateVehicleProps) {
    this.id = new VehicleId(props.id);
    this.licensePlate = new LicensePlate(props.licensePlate);
    this.vehicleModel = new VehicleModel(props.model, props.manufacturer, props.year);
    this.description = props.description || null;
    this.color = new VehicleColor(props.color);
    this.fuelType = new FuelType(props.fuelType);
    this.odometer = new Odometer(props.odometer);
    this.status = new VehicleStatus(props.status || 'ACTIVE');
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.deletedAt = props.deletedAt || null;
  }

  static create(props: CreateVehicleProps): Vehicle {
    return new Vehicle(props);
  }

  getId(): VehicleId {
    return this.id;
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

  getStatus(): VehicleStatus {
    return this.status;
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

  updateStatus(newStatus: string | VehicleStatus): void {
    try {
      const statusValue =
        typeof newStatus === 'string' ? newStatus : newStatus.getValue();
      this.status = new VehicleStatus(statusValue);
      this.updatedAt = new Date();
    } catch (error) {
      throw new InvalidVehicleStatusException((newStatus as any).toString());
    }
  }

  activate(): void {
    this.updateStatus('ACTIVE');
  }

  sendToMaintenance(): void {
    this.updateStatus('MAINTENANCE');
  }

  updateVehicleInfo(props: UpdateVehicleProps): void {
    try {
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

      if (props.status) {
        this.status = new VehicleStatus(props.status);
      }

      this.updatedAt = new Date();
    } catch (error: any) {
      throw new VehicleException(
        `Error updating vehicle: ${error.message}`);
    }
  }

  incrementOdometer(kilometers: number): void {
    try {
      this.odometer = this.odometer.increment(kilometers);
      this.updatedAt = new Date();
    } catch (error: any) {
      throw new VehicleException(
        `Error incrementing odometer: ${error.message}`,
      );
    }
  }

  equals(other: Vehicle): boolean {
    return this.id.equals(other.getId());
  }

  toPrimitives() {
    return {
      id: this.id.getValue(),
      licensePlate: this.licensePlate.getValue(),
      model: this.vehicleModel.getModel(),
      year: this.vehicleModel.getYear(),
      manufacturer: this.vehicleModel.getManufacturer(),
      description: this.description,
      color: this.color.getValue(),
      fuelType: this.fuelType.getValue(),
      odometer: this.odometer.getValue(),
      status: this.status.getValue(),
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

    this.updateStatus('INACTIVE');
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
