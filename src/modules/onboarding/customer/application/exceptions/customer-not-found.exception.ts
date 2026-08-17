export class CustomerNotFoundException extends Error {
  constructor(id: string) {
    super(`Customer with id "${id}" not found.`);
    this.name = 'CustomerNotFoundException';
  }
}
