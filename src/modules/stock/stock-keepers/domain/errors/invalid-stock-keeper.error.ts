export class InvalidStockKeeperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStockKeeperError';
  }
}
