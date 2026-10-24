import { InMemoryCustomerRepository } from '../__test__/in-memory-customer.repository';
import {
  CustomerRegistrationRejectedError,
  type NewCustomer,
} from './customer-registration';
import { DomainCustomerRegistration } from './customer-registration.impl';

const newCustomer: NewCustomer = {
  userId: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
  personType: 'CPF',
  document: '529.982.247-25',
  name: 'Ana Souza',
  email: 'ana@example.com',
  phone: { countryCode: '55', areaCode: '11', number: '999998888' },
  address: {
    street: 'Rua das Flores',
    number: '100',
    neighborhood: 'Centro',
    city: 'Sao Paulo',
    state: 'SP',
    zipCode: '01001000',
  },
};

describe('DomainCustomerRegistration', () => {
  let repository: InMemoryCustomerRepository;
  let registration: DomainCustomerRegistration;

  beforeEach(() => {
    repository = new InMemoryCustomerRepository();
    registration = new DomainCustomerRegistration(repository);
  });

  it('writes nothing until commit', async () => {
    const pending = await registration.prepare(newCustomer);

    expect(pending.isNew).toBe(true);
    expect(repository.customers.size).toBe(0);

    await pending.commit();
    expect(repository.customers.get(pending.customerId)).toBeDefined();
  });

  it('reuses the customer already registered under the same document', async () => {
    const first = await registration.prepare(newCustomer);
    await first.commit();

    const second = await registration.prepare({
      ...newCustomer,
      document: '52998224725',
      name: 'Outro Nome',
    });
    await second.commit();

    expect(second.isNew).toBe(false);
    expect(second.customerId).toBe(first.customerId);
    expect(repository.customers.size).toBe(1);
  });

  it('rejects invalid data with the published error', async () => {
    await expect(
      registration.prepare({ ...newCustomer, document: '12345678900' }),
    ).rejects.toThrow(CustomerRegistrationRejectedError);
  });
});
