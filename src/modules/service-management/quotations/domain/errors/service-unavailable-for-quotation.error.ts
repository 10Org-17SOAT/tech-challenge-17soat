export class ServiceUnavailableForQuotationError extends Error {
  constructor(readonly serviceIds: string[]) {
    super(
      `Cannot issue a quotation: services no longer in the catalogue: ${serviceIds.join(', ')}`,
    );
    this.name = 'ServiceUnavailableForQuotationError';
  }
}
