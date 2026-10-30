/**
 * The stock module's published contract — the only thing other modules may
 * import from `stock`. Everything under `domain/`, `application/` and
 * `infrastructure/` is private to this module.
 *
 * It answers one question: what are these supplies called and what do they
 * cost right now. Callers get a plain view, never the `Supply` entity, so
 * stock stays free to reshape its own model.
 */
export interface SupplyView {
  id: string;
  name: string;
  priceInCents: number;
}

export interface SupplyCatalogQuery {
  /**
   * Batched on purpose: a quotation prices several parts at once, and one
   * lookup per part would be an N+1. Supplies that do not exist — or were
   * soft-deleted — are simply absent from the map; absence is the answer, so
   * no `deleted` flag crosses the module boundary.
   */
  findManyByIds(ids: string[]): Promise<Map<string, SupplyView>>;
}

export const SUPPLY_CATALOG_QUERY = Symbol('SUPPLY_CATALOG_QUERY');
