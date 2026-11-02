export class SupplyNotFoundError extends Error {
  constructor(id: string) {
    super(`Supply "${id}" was not found`);
    this.name = 'SupplyNotFoundError';
  }
}
