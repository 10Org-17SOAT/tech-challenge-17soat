export class ExceedsReservedQuantityError extends Error {
  constructor(
    readonly supplyId: string,
    readonly serviceOrderReference: string,
    readonly requestedQuantity: number,
    readonly reservedQuantity: number,
  ) {
    super(
      `Cannot write off ${requestedQuantity} units of supply ${supplyId} for service order ${serviceOrderReference}: only ${reservedQuantity} reserved`,
    );
    this.name = 'ExceedsReservedQuantityError';
  }
}
