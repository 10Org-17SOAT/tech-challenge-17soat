/** One or more requested services are not in the catalogue (or were removed). */
export class ServicesNotFoundForServiceOrderError extends Error {
  constructor(readonly serviceIds: string[]) {
    super(`Services not found: ${serviceIds.join(', ')}`);
    this.name = 'ServicesNotFoundForServiceOrderError';
  }
}
