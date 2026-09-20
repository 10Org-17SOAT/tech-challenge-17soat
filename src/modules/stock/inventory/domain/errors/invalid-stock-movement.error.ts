export class InvalidStockMovementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStockMovementError';
  }
}
