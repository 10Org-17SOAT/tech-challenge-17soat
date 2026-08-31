export class QuotationAlreadyApprovedError extends Error {
  constructor(readonly quotationId: string) {
    super(`Quotation ${quotationId} has already been approved`);
    this.name = 'QuotationAlreadyApprovedError';
  }
}
