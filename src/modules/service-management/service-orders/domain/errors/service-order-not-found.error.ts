export class ServiceOrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order "${id}" was not found`);
    this.name = 'ServiceOrderNotFoundError';
  }
}
