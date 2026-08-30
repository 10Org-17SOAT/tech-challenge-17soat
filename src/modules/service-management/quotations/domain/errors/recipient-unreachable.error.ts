/**
 * The order → vehicle → owner chain broke somewhere: a deleted vehicle, a
 * soft-deleted customer. The quotation is fine; there is simply nobody to send
 * it to, and that is worth saying out loud rather than silently not mailing.
 */
export class RecipientUnreachableError extends Error {
  constructor(readonly serviceOrderId: string) {
    super(
      `No reachable customer for service order "${serviceOrderId}": the vehicle or its owner is missing`,
    );
    this.name = 'RecipientUnreachableError';
  }
}
