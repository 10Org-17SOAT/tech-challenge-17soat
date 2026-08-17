import { CreateCustomerUseCase } from './create-customer.use-case';
import { CustomerRepository } from '../../domain/repository/customer.repository';
import { PersonType } from '../../domain/value-objects/person-type.enum';
import { CreateCustomerInput } from '../dto/customer.dto';
import { InvalidDocumentException } from '../../domain/exceptions/customer.exceptions';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let repository: jest.Mocked<CustomerRepository>;

  const validPFInput: CreateCustomerInput = {
    personType: PersonType.CPF,
    document: '52998224725',
    name: 'João Silva',
    email: 'joao@example.com',
    phone: { countryCode: '55', areaCode: '11', number: '912345678' },
    address: {
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
    },
  };

  const validPJInput: CreateCustomerInput = {
    personType: PersonType.CNPJ,
    document: '12345678000195',
    corporateName: 'Empresa Exemplo LTDA',
    tradeName: 'Empresa Exemplo',
    email: 'contato@empresa.com',
    phone: { countryCode: '55', areaCode: '11', number: '912345678' },
    address: {
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
    },
  };

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByDocument: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateCustomerUseCase(repository);
  });

  describe('PF customer', () => {
    it('creates a PF customer and returns response DTO', async () => {
      repository.save.mockImplementation(async (customer) => customer);

      const result = await useCase.execute(validPFInput);

      expect(result.personType).toBe(PersonType.CPF);
      expect(result.name).toBe('João Silva');
      expect(result.document).toBe('52998224725');
      expect(result.id).toBeDefined();
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid document', async () => {
      await expect(
        useCase.execute({ ...validPFInput, document: '123' }),
      ).rejects.toThrow(InvalidDocumentException);
    });
  });

  describe('PJ customer', () => {
    it('creates a PJ customer and returns response DTO', async () => {
      repository.save.mockImplementation(async (customer) => customer);

      const result = await useCase.execute(validPJInput);

      expect(result.personType).toBe(PersonType.CNPJ);
      expect(result.corporateName).toBe('Empresa Exemplo LTDA');
      expect(result.tradeName).toBe('Empresa Exemplo');
      expect(result.name).toBeNull();
    });
  });
});
