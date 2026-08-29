import { SoftDeleteCustomerUseCase } from '@/modules/onboarding/customer/application/use-cases/soft-delete-customer.use-case';
import { CustomerRepository } from '@/modules/onboarding/customer/domain/repository/customer.repository';
import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';
import { Document } from '@/modules/onboarding/customer/domain/value-objects/document.value-object';
import { Email } from '@/modules/onboarding/customer/domain/value-objects/email.value-object';
import { Phone } from '@/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { Address } from '@/modules/onboarding/customer/domain/value-objects/address.value-object';
import { CustomerNotFoundException } from '@/modules/onboarding/customer/application/exceptions/customer-application.exception';

describe('SoftDeleteCustomerUseCase', () => {
  let useCase: SoftDeleteCustomerUseCase;
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
    useCase = new SoftDeleteCustomerUseCase(repository);
  });

  it('soft deletes customer', async () => {
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
    repository.save.mockImplementation((c: Customer) => c);

    await useCase.execute({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(customer.getDeletedAt()).toBeInstanceOf(Date);
  });

  it('throws CustomerNotFoundException when customer does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'non-existent-id' })).rejects.toThrow(
      CustomerNotFoundException,
    );
  });
});
