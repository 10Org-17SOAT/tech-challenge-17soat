/**
 * Published contract for registering a vehicle from outside onboarding. Same
 * two-step shape as `CustomerRegistration`: `prepare` validates and resolves
 * the id, `commit` writes.
 *
 * The owner is not looked up here: the caller may be registering the owner in
 * the same request, so that customer does not exist yet when this runs.
 * Resolving the owner is the caller's job; the foreign key still backs it up.
 */
export interface NewVehicle {
  ownerId: string;
  licensePlate: string;
  model: string;
  year: number;
  manufacturer: string;
  description?: string;
  color: string;
  fuelType: string;
  odometer: number;
}

export interface PendingVehicleRegistration {
  readonly vehicleId: string;
  /** False when the plate was already registered to this owner and is reused. */
  readonly isNew: boolean;
  /** A no-op when the vehicle already existed. */
  commit(): Promise<void>;
}

export interface VehicleRegistration {
  /**
   * The plate is the vehicle's identity. A plate already registered to the
   * same owner is reused untouched; registered to anyone else (or removed) it
   * throws `LicensePlateTakenError`. Invalid data throws
   * `VehicleRegistrationRejectedError`.
   */
  prepare(vehicle: NewVehicle): Promise<PendingVehicleRegistration>;
}

/** The data does not describe a valid vehicle. The message says why. */
export class VehicleRegistrationRejectedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'VehicleRegistrationRejectedError';
  }
}

export class LicensePlateTakenError extends Error {
  constructor(readonly licensePlate: string) {
    super(
      `License plate "${licensePlate}" is already registered to another customer`,
    );
    this.name = 'LicensePlateTakenError';
  }
}

export const VEHICLE_REGISTRATION = Symbol('VEHICLE_REGISTRATION');
