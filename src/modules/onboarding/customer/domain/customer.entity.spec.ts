import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';
import { Document } from '@/modules/onboarding/customer/domain/value-objects/document.value-object';
import { Email } from '@/modules/onboarding/customer/domain/value-objects/email.value-object';
import { Phone } from '@/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { Address } from '@/modules/onboarding/customer/domain/value-objects/address.value-object';
import { InvalidCustomerException } from '@/modules/onboarding/customer/domain/exceptions/customer.exceptions';

describe('Customer entity', () => {
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

  describe('PF creation', () => {
    it('creates a valid PF customer', () => {
      const customer = Customer.create({
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
      });

      expect(customer.getPersonType()).toBe(PersonType.CPF);
      expect(customer.getName()).toBe('João Silva');
      expect(customer.getDocument().getValue()).toBe('52998224725');
      expect(customer.getEmail().getValue()).toBe('joao@example.com');
      expect(customer.getId()).toBeDefined();
      expect(customer.getCreatedAt()).toBeInstanceOf(Date);
    });

    it('rejects PF without name', () => {
      expect(() =>
        Customer.create({
          personType: PersonType.CPF,
          document: new Document('52998224725'),
          email: new Email('joao@example.com'),
          phone: validPhone,
          address: validAddress,
        }),
      ).toThrow(InvalidCustomerException);
    });

    it('rejects PF with corporateName', () => {
      expect(() =>
        Customer.create({
          personType: PersonType.CPF,
          document: new Document('52998224725'),
          name: 'João Silva',
          corporateName: 'Empresa LTDA',
          email: new Email('joao@example.com'),
          phone: validPhone,
          address: validAddress,
        }),
      ).toThrow(InvalidCustomerException);
    });

    it('rejects PF with tradeName', () => {
      expect(() =>
        Customer.create({
          personType: PersonType.CPF,
          document: new Document('52998224725'),
          name: 'João Silva',
          tradeName: 'Empresa',
          email: new Email('joao@example.com'),
          phone: validPhone,
          address: validAddress,
        }),
      ).toThrow(InvalidCustomerException);
    });
  });

  describe('PJ creation', () => {
    it('creates a valid PJ customer', () => {
      const customer = Customer.create({
        personType: PersonType.CNPJ,
        document: new Document('12345678000195'),
        corporateName: 'Empresa Exemplo LTDA',
        tradeName: 'Empresa Exemplo',
        email: new Email('contato@empresa.com'),
        phone: validPhone,
        address: validAddress,
      });

      expect(customer.getPersonType()).toBe(PersonType.CNPJ);
      expect(customer.getCorporateName()).toBe('Empresa Exemplo LTDA');
      expect(customer.getTradeName()).toBe('Empresa Exemplo');
      expect(customer.getName()).toBeNull();
    });

    it('rejects PJ without corporateName', () => {
      expect(() =>
        Customer.create({
          personType: PersonType.CNPJ,
          document: new Document('12345678000195'),
          tradeName: 'Empresa',
          email: new Email('contato@empresa.com'),
          phone: validPhone,
          address: validAddress,
        }),
      ).toThrow(InvalidCustomerException);
    });

    it('rejects PJ without tradeName', () => {
      expect(() =>
        Customer.create({
          personType: PersonType.CNPJ,
          document: new Document('12345678000195'),
          corporateName: 'Empresa LTDA',
          email: new Email('contato@empresa.com'),
          phone: validPhone,
          address: validAddress,
        }),
      ).toThrow(InvalidCustomerException);
    });

    it('rejects PJ with name', () => {
      expect(() =>
        Customer.create({
          personType: PersonType.CNPJ,
          document: new Document('12345678000195'),
          name: 'João Silva',
          corporateName: 'Empresa LTDA',
          tradeName: 'Empresa',
          email: new Email('contato@empresa.com'),
          phone: validPhone,
          address: validAddress,
        }),
      ).toThrow(InvalidCustomerException);
    });
  });

  describe('restore', () => {
    it('restores a customer from persisted data', () => {
      const now = new Date();
      const customer = Customer.restore({
        id: '123e4567-e89b-12d3-a456-426614174000',
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      expect(customer.getId()).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(customer.getCreatedAt()).toBe(now);
      expect(customer.getUpdatedAt()).toBe(now);
      expect(customer.getDeletedAt()).toBeNull();
    });
  });

  describe('behavior', () => {
    it('soft delete sets deletedAt', () => {
      const customer = Customer.create({
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
      });

      expect(customer.getDeletedAt()).toBeNull();

      customer.softDelete();

      expect(customer.getDeletedAt()).toBeInstanceOf(Date);
    });

    it('is equal to another Customer with the same id', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const now = new Date();

      const first = Customer.restore({
        id,
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      const second = Customer.restore({
        id,
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      expect(first.equals(second)).toBe(true);
    });

    it('is not equal to a Customer with a different id', () => {
      const now = new Date();

      const first = Customer.restore({
        id: '123e4567-e89b-12d3-a456-426614174000',
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      const second = Customer.restore({
        id: '123e4567-e89b-12d3-a456-426614174001',
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      expect(first.equals(second)).toBe(false);
    });

    it('exposes all fields through toPrimitives', () => {
      const now = new Date();
      const customer = Customer.restore({
        id: '123e4567-e89b-12d3-a456-426614174000',
        personType: PersonType.CPF,
        document: new Document('52998224725'),
        name: 'João Silva',
        email: new Email('joao@example.com'),
        phone: validPhone,
        address: validAddress,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      const primitives = customer.toPrimitives();

      expect(primitives).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        personType: PersonType.CPF,
        document: '52998224725',
        name: 'João Silva',
        corporateName: null,
        tradeName: null,
        email: 'joao@example.com',
        phone: { countryCode: '55', areaCode: '11', number: '912345678' },
        address: {
          street: 'Rua das Flores',
          number: '123',
          complement: null,
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
        },
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    });
  });
});
