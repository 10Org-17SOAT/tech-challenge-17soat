export class VehicleException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VehicleException';
  }
}

export class InvalidLicensePlateException extends VehicleException {
  constructor(plate: string) {
    super(`Invalid license plate: "${plate}". Expected format: AAA-0000 or AAA0B00`);
    this.name = 'InvalidLicensePlateException';
  }
}

export class DuplicateLicensePlateException extends VehicleException {
  constructor(plate: string) {
    super(
      `A vehicle with license plate "${plate}" already exists in the system.`,
    );
    this.name = 'DuplicateLicensePlateException';
  }
}

export class VehicleNotFoundException extends VehicleException {
  constructor(id?: string) {
    super(
      id ? `Vehicle with ID "${id}" was not found.` : 'Vehicle was not found.',
    );
    this.name = 'VehicleNotFoundException';
  }
}

export class InvalidVehicleStatusException extends VehicleException {
  constructor(status: string) {
    super(
      `Invalid vehicle status: "${status}". Expected: ACTIVE, INACTIVE, or MAINTENANCE.`,
    );
    this.name = 'InvalidVehicleStatusException';
  }
}

export class InvalidVehicleModelException extends VehicleException {
  constructor(message: string) {
    super(`Invalid vehicle model: ${message}`);
    this.name = 'InvalidVehicleModelException';
  }
}

export class InvalidFuelTypeException extends VehicleException {
  constructor(fuelType: string) {
    super(
      `Invalid fuel type: "${fuelType}". Expected: GASOLINE, ETHANOL, DIESEL, or HYBRID.`,
    );
    this.name = 'InvalidFuelTypeException';
  }
}

export class InvalidOdometerException extends VehicleException {
  constructor(odometer: number) {
    super(`Invalid odometer value: ${odometer}. Must be a non-negative integer.`);
    this.name = 'InvalidOdometerException';
  }
}
