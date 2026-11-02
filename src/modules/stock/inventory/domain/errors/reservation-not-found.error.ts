export class ReservationNotFoundError extends Error {
  constructor(
    readonly supplyId: string,
    readonly serviceOrderReference: string,
  ) {
    super(
      `No reservation of supply ${supplyId} found for service order ${serviceOrderReference}`,
    );
    this.name = 'ReservationNotFoundError';
  }
}
