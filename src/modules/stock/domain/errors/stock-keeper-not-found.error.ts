export class StockKeeperNotFoundError extends Error {
  constructor(id: string) {
    super(`Stock keeper "${id}" was not found`);
    this.name = 'StockKeeperNotFoundError';
  }
}
