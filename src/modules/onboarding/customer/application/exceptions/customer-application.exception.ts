import { CustomerNotFoundException } from '../exceptions/customer-application.exception';

export class CustomerApplicationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerApplicationException';
  }
}

export { CustomerNotFoundException };
