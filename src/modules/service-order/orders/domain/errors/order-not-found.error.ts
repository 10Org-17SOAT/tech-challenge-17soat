export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order "${id}" was not found`);
    this.name = 'OrderNotFoundError';
  }
}
