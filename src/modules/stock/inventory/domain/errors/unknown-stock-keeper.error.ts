/**
 * The ledger was handed a stock keeper id it cannot verify. Distinct from the
 * stock keepers module's own `StockKeeperNotFoundError`, which answers "you
 * asked for a keeper that does not exist" on that module's own routes: here
 * the id is an input to a movement, not the thing being fetched.
 */
export class UnknownStockKeeperError extends Error {
  constructor(readonly stockKeeperId: string) {
    super(`Stock keeper "${stockKeeperId}" not found`);
    this.name = 'UnknownStockKeeperError';
  }
}
