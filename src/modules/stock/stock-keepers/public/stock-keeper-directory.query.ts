/**
 * The stock keeper module's published contract — the only thing other
 * modules may import from `stock-keepers`. Everything under `domain/`,
 * `application/` and `infrastructure/` is private to this module.
 *
 * It answers one question: who is this stock keeper, right now. Callers get
 * a plain view, never the `StockKeeper` entity, so this module stays free to
 * reshape its own model — which it will, once stock keepers become plain
 * users. Absence (soft-deleted or unknown id) is a `null`, not an error: the
 * caller decides what that means for its own domain.
 */
export interface StockKeeperView {
  id: string;
  name: string;
}

export interface StockKeeperDirectoryQuery {
  findById(id: string): Promise<StockKeeperView | null>;
}

export const STOCK_KEEPER_DIRECTORY_QUERY = Symbol(
  'STOCK_KEEPER_DIRECTORY_QUERY',
);
