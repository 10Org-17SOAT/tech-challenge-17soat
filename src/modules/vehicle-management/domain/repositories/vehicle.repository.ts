import { Vehicle } from '../entities/vehicle.entity';
import { VehicleId } from '../value-objects';
import { LicensePlate } from '../value-objects';

export interface IVehicleRepository {
  save(vehicle: Vehicle): Promise<void>;
  findById(id: VehicleId): Promise<Vehicle | null>;
  findByLicensePlate(plate: LicensePlate): Promise<Vehicle | null>;
  findAll(limit: number, offset: number): Promise<Vehicle[]>;
  findAllCount(): Promise<number>;
  delete(id: VehicleId): Promise<void>;
}
