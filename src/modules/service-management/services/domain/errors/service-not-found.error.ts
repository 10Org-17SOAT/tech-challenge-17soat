export class ServiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Service "${id}" was not found`);
    this.name = 'ServiceNotFoundError';
  }
}
