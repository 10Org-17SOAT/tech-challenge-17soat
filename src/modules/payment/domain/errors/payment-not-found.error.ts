export class PaymentNotFoundError extends Error {
  constructor(readonly paymentId: string) {
    super(`Payment ${paymentId} not found`);
    this.name = 'PaymentNotFoundError';
  }
}
