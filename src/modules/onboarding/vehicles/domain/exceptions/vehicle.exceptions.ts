export class VehicleException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VehicleException';
  }
}

export class InvalidLicensePlateException extends VehicleException {
  constructor(plate: string) {
    super(
      `Invalid license plate: "${plate}". Expected format: AAA-0000 or AAA0B00`,
    );
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
  constructor(odometer: number, reason = 'Must be a non-negative integer.') {
    super(`Invalid odometer value: ${odometer}. ${reason}`);
    this.name = 'InvalidOdometerException';
  }
}

export class InvalidVehicleColorException extends VehicleException {
  constructor(message: string) {
    super(`Invalid vehicle color: ${message}`);
    this.name = 'InvalidVehicleColorException';
  }
}

export class VehicleOwnerNotFoundException extends VehicleException {
  constructor(customerId: string) {
    super(
      `Customer "${customerId}" was not found, so no vehicle can be registered to them.`,
    );
    this.name = 'VehicleOwnerNotFoundException';
  }
}
