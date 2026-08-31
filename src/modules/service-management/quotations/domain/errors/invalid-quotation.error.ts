export class InvalidQuotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQuotationError';
  }
}
