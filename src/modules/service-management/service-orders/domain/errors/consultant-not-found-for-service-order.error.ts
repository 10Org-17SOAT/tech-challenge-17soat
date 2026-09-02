/**
 * An order was opened by a consultant that is not registered. Checked before
 * the insert so the caller gets a 404 it can act on, mirroring
 * VehicleNotFoundForServiceOrderError.
 */
export class ConsultantNotFoundForServiceOrderError extends Error {
  constructor(readonly consultantId: string) {
    super(`Consultant "${consultantId}" was not found`);
    this.name = 'ConsultantNotFoundForServiceOrderError';
  }
}
