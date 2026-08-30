export class PartUnavailableForQuotationError extends Error {
  constructor(readonly supplyIds: string[]) {
    super(
      `Cannot issue a quotation: parts no longer in the catalogue: ${supplyIds.join(', ')}`,
    );
    this.name = 'PartUnavailableForQuotationError';
  }
}
