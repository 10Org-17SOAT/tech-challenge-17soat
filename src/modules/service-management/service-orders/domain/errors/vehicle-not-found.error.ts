export class VehicleNotFoundError extends Error {
  constructor(vehicleId: string) {
    super(`Vehicle "${vehicleId}" not found`);
    this.name = 'VehicleNotFoundError';
  }
}