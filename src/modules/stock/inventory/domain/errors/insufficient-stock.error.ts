export class InsufficientStockError extends Error {
  constructor(
    readonly supplyId: string,
    readonly requestedQuantity: number,
    readonly availableBalance: number,
  ) {
    super(
      `Cannot reserve ${requestedQuantity} units of supply ${supplyId}: only ${availableBalance} available`,
    );
    this.name = 'InsufficientStockError';
  }
}
