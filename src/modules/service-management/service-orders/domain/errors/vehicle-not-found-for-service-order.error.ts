/**
 * An order was opened for a vehicle that is not registered. Checked before the
 * insert so the caller gets a 404 it can act on, rather than a foreign key
 * violation surfacing as a 500.
 */
export class VehicleNotFoundForServiceOrderError extends Error {
  constructor(readonly vehicleId: string) {
    super(`Vehicle "${vehicleId}" was not found`);
    this.name = 'VehicleNotFoundForServiceOrderError';
  }
}
