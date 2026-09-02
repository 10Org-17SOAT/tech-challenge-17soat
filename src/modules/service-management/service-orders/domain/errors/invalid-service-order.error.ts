export class InvalidServiceOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidServiceOrderError';
  }
}
