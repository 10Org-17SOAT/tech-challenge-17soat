import { FindAllCustomersUseCase } from './find-all-customers.use-case';
import { CustomerRepository } from '../../domain/repository/customer.repository';
import { Customer } from '../../domain/customer.entity';
import { PersonType } from '../../domain/value-objects/person-type.enum';
import { Document } from '../../domain/value-objects/document.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Phone } from '../../domain/value-objects/phone.value-object';
import { Address } from '../../domain/value-objects/address.value-object';

describe('FindAllCustomersUseCase', () => {
  let useCase: FindAllCustomersUseCase;
  let repository: jest.Mocked<CustomerRepository>;

  const validAddress = new Address({
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310100',
  });

  const validPhone = new Phone({
    countryCode: '55',
    areaCode: '11',
    number: '912345678',
  });

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByDocument: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new FindAllCustomersUseCase(repository);
  });

  it('returns paginated customers', async () => {
    const customer = Customer.restore({
      id: '123e4567-e89b-12d3-a456-426614174000',
      personType: PersonType.CPF,
      document: new Document('52998224725'),
      name: 'João Silva',
      email: new Email('joao@example.com'),
      phone: validPhone,
      address: validAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    repository.findAll.mockResolvedValue({
      data: [customer],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('returns empty list when no customers exist', async () => {
    repository.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
