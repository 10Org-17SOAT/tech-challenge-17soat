/** An order was opened referencing a customer id that is not registered. */
export class CustomerNotFoundForServiceOrderError extends Error {
  constructor(readonly customerId: string) {
    super(`Customer "${customerId}" was not found`);
    this.name = 'CustomerNotFoundForServiceOrderError';
  }
}
