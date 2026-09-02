export class ServiceOrderAlreadyPaidError extends Error {
  constructor(readonly serviceOrderId: string) {
    super(`Service order ${serviceOrderId} has already been paid`);
    this.name = 'ServiceOrderAlreadyPaidError';
  }
}
