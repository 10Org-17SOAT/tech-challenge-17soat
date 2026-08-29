import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { DuplicateDocumentException } from '@/modules/onboarding/customer/domain/exceptions/customer.exceptions';
import type {
  CustomerRepository,
  FindAllParams,
  PaginatedResult,
} from '@/modules/onboarding/customer/domain/repository/customer.repository';

export class InMemoryCustomerRepository implements CustomerRepository {
  readonly customers = new Map<string, Customer>();

  save(customer: Customer): Promise<Customer> {
    const document = customer.getDocument().getValue();

    const activeHolder = [...this.customers.values()].find(
      (candidate) =>
        candidate.getId() !== customer.getId() &&
        candidate.getDocument().getValue() === document &&
        candidate.getDeletedAt() === null,
    );

    if (activeHolder) {
      return Promise.reject(new DuplicateDocumentException(document));
    }

    this.customers.set(customer.getId(), customer);
    return Promise.resolve(customer);
  }

  findById(id: string): Promise<Customer | null> {
    const customer = this.customers.get(id);
    const isActive = customer !== undefined && customer.getDeletedAt() === null;
    return Promise.resolve(isActive ? customer : null);
  }

  findByDocument(document: string): Promise<Customer | null> {
    let found: Customer | null = null;
    for (const customer of this.customers.values()) {
      if (
        customer.getDocument().getValue() === document &&
        customer.getDeletedAt() === null
      ) {
        found = customer;
        break;
      }
    }
    return Promise.resolve(found);
  }

  findAll(params: FindAllParams): Promise<PaginatedResult<Customer>> {
    const { page, limit, filters } = params;

    const active = [...this.customers.values()]
      .filter((customer) => customer.getDeletedAt() === null)
      .filter((customer) => {
        if (!filters) {
          return true;
        }
        if (
          filters.personType &&
          customer.getPersonType() !== filters.personType
        ) {
          return false;
        }
        if (filters.name) {
          const name = customer.getName()?.toLowerCase();
          if (!name || !name.includes(filters.name.toLowerCase())) {
            return false;
          }
        }
        if (
          filters.document &&
          customer.getDocument().getValue() !== filters.document
        ) {
          return false;
        }
        if (filters.email && customer.getEmail().getValue() !== filters.email) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const byDate = a.getCreatedAt().getTime() - b.getCreatedAt().getTime();
        return byDate !== 0 ? byDate : a.getId().localeCompare(b.getId());
      });

    const total = active.length;

    return Promise.resolve({
      data: active.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  delete(id: string): Promise<void> {
    const customer = this.customers.get(id);
    if (customer && customer.getDeletedAt() === null) {
      customer.softDelete();
    }
    return Promise.resolve();
  }
}
