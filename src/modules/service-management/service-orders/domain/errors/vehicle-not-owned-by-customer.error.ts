/**
 * The vehicle exists but belongs to someone else. The order's customer is
 * derived from its vehicle, so accepting this would silently open the order
 * for a different person than the one at the desk.
 */
export class VehicleNotOwnedByCustomerError extends Error {
  constructor(
    readonly vehicleId: string,
    readonly customerId: string,
  ) {
    super(`Vehicle "${vehicleId}" does not belong to customer "${customerId}"`);
    this.name = 'VehicleNotOwnedByCustomerError';
  }
}
