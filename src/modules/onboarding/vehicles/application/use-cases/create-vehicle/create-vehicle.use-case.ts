import { Inject, Injectable } from '@nestjs/common';
import type { IVehicleRepository } from '../../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import { LicensePlate } from '../../../domain/value-objects';
import {
  DuplicateLicensePlateException,
  VehicleOwnerNotFoundException,
} from '../../../domain/exceptions/vehicle.exceptions';
import { CUSTOMER_CONTACT_QUERY } from '../../../../customer/public/customer-contact.query';
import type { CustomerContactQuery } from '../../../../customer/public/customer-contact.query';
import { CreateVehicleInput, CreateVehicleOutput } from './create-vehicle.dto';

@Injectable()
export class CreateVehicleUseCase {
  constructor(
    @Inject('VEHICLE_REPOSITORY')
    private readonly vehicleRepository: IVehicleRepository,
    // Checked here rather than left to the foreign key: an unknown owner is a
    // 404 the caller can act on, not a Postgres constraint error surfacing
    // as a 500.
    @Inject(CUSTOMER_CONTACT_QUERY)
    private readonly customers: CustomerContactQuery,
  ) {}

  async execute(input: CreateVehicleInput): Promise<CreateVehicleOutput> {
    const owner = await this.customers.findById(input.customerId);
    if (!owner) {
      throw new VehicleOwnerNotFoundException(input.customerId);
    }

    // Check if license plate already exists
    const licensePlate = new LicensePlate(input.licensePlate);
    const existingVehicle =
      await this.vehicleRepository.findByLicensePlate(licensePlate);

    if (existingVehicle) {
      throw new DuplicateLicensePlateException(licensePlate.getValue());
    }

    // Create vehicle entity
    const vehicle = Vehicle.create({
      customerId: input.customerId,
      licensePlate: input.licensePlate,
      model: input.model,
      year: input.year,
      manufacturer: input.manufacturer,
      description: input.description,
      color: input.color,
      fuelType: input.fuelType,
      odometer: input.odometer,
    });

    // Save vehicle
    await this.vehicleRepository.save(vehicle);

    // Return output
    const primitives = vehicle.toPrimitives();

    return {
      vehicle_id: primitives.vehicle_id,
      customerId: primitives.customerId,
      licensePlate: primitives.licensePlate,
      model: primitives.model,
      year: primitives.year,
      manufacturer: primitives.manufacturer,
      description: primitives.description,
      color: primitives.color,
      fuelType: primitives.fuelType,
      odometer: primitives.odometer,
    };
  }
}
