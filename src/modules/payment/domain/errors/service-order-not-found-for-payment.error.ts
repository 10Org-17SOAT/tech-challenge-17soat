export class ServiceOrderNotFoundForPaymentError extends Error {
  constructor(readonly serviceOrderId: string) {
    super(`No billable service order ${serviceOrderId}`);
    this.name = 'ServiceOrderNotFoundForPaymentError';
  }
}
