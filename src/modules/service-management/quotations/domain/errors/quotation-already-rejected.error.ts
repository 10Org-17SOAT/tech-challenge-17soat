export class QuotationAlreadyRejectedError extends Error {
  constructor(readonly quotationId: string) {
    super(`Quotation ${quotationId} has already been rejected`);
    this.name = 'QuotationAlreadyRejectedError';
  }
}
