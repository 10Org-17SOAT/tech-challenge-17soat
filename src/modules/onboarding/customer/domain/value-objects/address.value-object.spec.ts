import { Address } from '@/modules/onboarding/customer/domain/value-objects/address.value-object';
import { InvalidAddressException } from '@/modules/onboarding/customer/domain/exceptions/customer.exceptions';

describe('Address value object', () => {
  describe('creation', () => {
    it('creates a valid address with all required fields', () => {
      const address = new Address({
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'sp',
        zipCode: '01310-100',
      });

      expect(address.getStreet()).toBe('Rua das Flores');
      expect(address.getNumber()).toBe('123');
      expect(address.getComplement()).toBeNull();
      expect(address.getNeighborhood()).toBe('Centro');
      expect(address.getCity()).toBe('São Paulo');
      expect(address.getState()).toBe('SP');
      expect(address.getZipCode()).toBe('01310100');
    });

    it('creates a valid address with complement', () => {
      const address = new Address({
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Apto 42',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'sp',
        zipCode: '01310-100',
      });

      expect(address.getComplement()).toBe('Apto 42');
    });

    it('normalizes state to uppercase', () => {
      const address = new Address({
        street: 'Rua A',
        number: '1',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'sp',
        zipCode: '13010111',
      });

      expect(address.getState()).toBe('SP');
    });

    it('strips non-digits from zipCode', () => {
      const address = new Address({
        street: 'Rua A',
        number: '1',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        zipCode: '13.010-111',
      });

      expect(address.getZipCode()).toBe('13010111');
    });
  });

  describe('validation', () => {
    it('rejects empty street', () => {
      expect(
        () =>
          new Address({
            street: '',
            number: '1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310100',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects empty number', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310100',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects empty neighborhood', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: '',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310100',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects empty city', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: 'Centro',
            city: '',
            state: 'SP',
            zipCode: '01310100',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects empty state', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: '',
            zipCode: '01310100',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects state with more than 2 characters', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SPO',
            zipCode: '01310100',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects state with non-letter characters', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: '1A',
            zipCode: '01310100',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects empty zipCode', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects zipCode with less than 8 digits', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '1234567',
          }),
      ).toThrow(InvalidAddressException);
    });

    it('rejects zipCode with more than 8 digits', () => {
      expect(
        () =>
          new Address({
            street: 'Rua A',
            number: '1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '123456789',
          }),
      ).toThrow(InvalidAddressException);
    });
  });

  describe('behavior', () => {
    it('is equal to another Address with the same values', () => {
      const first = new Address({
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const second = new Address({
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(first.equals(second)).toBe(true);
    });

    it('is not equal to an Address with different values', () => {
      const first = new Address({
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310100',
      });

      const second = new Address({
        street: 'Rua das Flores',
        number: '456',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310100',
      });

      expect(first.equals(second)).toBe(false);
    });

    it('exposes formatted value through toString', () => {
      const address = new Address({
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 1',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310100',
      });

      expect(address.toString()).toBe(
        'Rua das Flores, 123, Apto 1, Centro, São Paulo/SP, 01310100',
      );
    });

    it('formats toString without complement', () => {
      const address = new Address({
        street: 'Rua A',
        number: '1',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        zipCode: '13010111',
      });

      expect(address.toString()).toBe(
        'Rua A, 1, Centro, Campinas/SP, 13010111',
      );
    });
  });
});
