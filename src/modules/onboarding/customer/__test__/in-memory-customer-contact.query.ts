import type {
  CustomerContact,
  CustomerContactQuery,
} from '../public/customer-contact.query';

export class InMemoryCustomerContactQuery implements CustomerContactQuery {
  private readonly customers = new Map<string, CustomerContact>();

  add(customer: CustomerContact): void {
    this.customers.set(customer.id, customer);
  }

  findById(id: string): Promise<CustomerContact | null> {
    return Promise.resolve(this.customers.get(id) ?? null);
  }
}
