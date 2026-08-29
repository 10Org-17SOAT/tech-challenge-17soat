import { Vehicle } from '@/modules/onboarding/vehicles/domain/entities/vehicle.entity';
import { VehicleId } from '@/modules/onboarding/vehicles/domain/value-objects';
import { LicensePlate } from '@/modules/onboarding/vehicles/domain/value-objects';

export interface IVehicleRepository {
  save(vehicle: Vehicle): Promise<void>;
  findById(id: VehicleId): Promise<Vehicle | null>;
  findByLicensePlate(plate: LicensePlate): Promise<Vehicle | null>;
  findAll(limit: number, offset: number): Promise<Vehicle[]>;
  findAllCount(): Promise<number>;
  delete(vehicle: Vehicle): Promise<void>;
}
