export class InvalidServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidServiceError';
  }
}
