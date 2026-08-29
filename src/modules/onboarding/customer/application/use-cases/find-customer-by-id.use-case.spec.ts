import { FindCustomerByIdUseCase } from '@/modules/onboarding/customer/application/use-cases/find-customer-by-id.use-case';
import { CustomerRepository } from '@/modules/onboarding/customer/domain/repository/customer.repository';
import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';
import { Document } from '@/modules/onboarding/customer/domain/value-objects/document.value-object';
import { Email } from '@/modules/onboarding/customer/domain/value-objects/email.value-object';
import { Phone } from '@/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { Address } from '@/modules/onboarding/customer/domain/value-objects/address.value-object';
import { CustomerNotFoundException } from '@/modules/onboarding/customer/application/exceptions/customer-application.exception';

describe('FindCustomerByIdUseCase', () => {
  let useCase: FindCustomerByIdUseCase;
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
    useCase = new FindCustomerByIdUseCase(repository);
  });

  it('returns customer when found', async () => {
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

    repository.findById.mockResolvedValue(customer);

    const result = await useCase.execute({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.name).toBe('João Silva');
  });

  it('throws CustomerNotFoundException when not found', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'non-existent-id' })).rejects.toThrow(
      CustomerNotFoundException,
    );
  });
});
