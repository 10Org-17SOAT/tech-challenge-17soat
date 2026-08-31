/**
 * How service-management asks what a part is called and what it costs.
 *
 * The interface is defined here, in this module's own language — nothing in
 * `domain/` or `application/` knows that parts happen to live in the stock
 * module. Only the adapter under `infrastructure/` does.
 */
export interface PartView {
  id: string;
  name: string;
  priceInCents: number;
}

export interface PartCatalog {
  /**
   * Batched: a quotation prices every part in one call. Parts that no longer
   * exist in the catalogue are absent from the map — the caller decides what
   * that means (issuing a quotation refuses; see IssueQuotationUseCase).
   */
  findManyByIds(ids: string[]): Promise<Map<string, PartView>>;
}

export const PART_CATALOG = Symbol('PART_CATALOG');
