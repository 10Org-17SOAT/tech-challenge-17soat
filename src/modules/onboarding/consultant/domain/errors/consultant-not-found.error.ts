export class ConsultantNotFoundError extends Error {
  constructor(id: string) {
    super(`Consultant "${id}" was not found`);
    this.name = 'ConsultantNotFoundError';
  }
}
