import type {
  CustomerContact,
  CustomerContactQuery,
} from '../public/customer-contact.query';

export class InMemoryCustomerContactQuery implements CustomerContactQuery {
  private readonly customers = new Map<string, CustomerContact>();
  private readonly byUserId = new Map<string, string>();

  add(customer: CustomerContact, userId?: string): void {
    this.customers.set(customer.id, customer);
    if (userId) {
      this.byUserId.set(userId, customer.id);
    }
  }

  findById(id: string): Promise<CustomerContact | null> {
    return Promise.resolve(this.customers.get(id) ?? null);
  }

  findIdByUserId(userId: string): Promise<string | null> {
    return Promise.resolve(this.byUserId.get(userId) ?? null);
  }
}
