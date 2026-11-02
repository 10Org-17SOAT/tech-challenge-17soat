/** One or more requested parts are not in stock's catalogue (or were removed). */
export class PartsNotFoundForServiceOrderError extends Error {
  constructor(readonly supplyIds: string[]) {
    super(`Parts not found: ${supplyIds.join(', ')}`);
    this.name = 'PartsNotFoundForServiceOrderError';
  }
}
