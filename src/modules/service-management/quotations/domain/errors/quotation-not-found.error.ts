export class QuotationNotFoundError extends Error {
  constructor(readonly quotationId: string) {
    super(`Quotation ${quotationId} not found`);
    this.name = 'QuotationNotFoundError';
  }
}
