export class CustomerApplicationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerApplicationException';
  }
}

export class CustomerNotFoundException extends CustomerApplicationException {
  constructor(id: string) {
    super(`Customer with id "${id}" not found.`);
    this.name = 'CustomerNotFoundException';
  }
}
