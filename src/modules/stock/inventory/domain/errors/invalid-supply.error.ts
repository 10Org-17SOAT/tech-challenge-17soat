export class InvalidSupplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSupplyError';
  }
}
