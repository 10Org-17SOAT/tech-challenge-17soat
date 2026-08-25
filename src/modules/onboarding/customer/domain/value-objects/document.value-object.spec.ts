/// <reference types="jest" />
import { Document } from './document.value-object';
import { PersonType } from './person-type.enum';
import { InvalidDocumentException } from '../exceptions/customer.exceptions';

describe('Document value object', () => {
  describe('creation', () => {
    it('creates a valid CPF and normalizes it', () => {
      const document = new Document('529.982.247-25');

      expect(document.getValue()).toBe('52998224725');
      expect(document.getType()).toBe(PersonType.CPF);
    });

    it('accepts a CPF with digits only', () => {
      const document = new Document('52998224725');

      expect(document.getValue()).toBe('52998224725');
      expect(document.getType()).toBe(PersonType.CPF);
    });

    it('creates a valid CNPJ and normalizes it', () => {
      const document = new Document('11.222.333/0001-81');

      expect(document.getValue()).toBe('11222333000181');
      expect(document.getType()).toBe(PersonType.CNPJ);
    });

    it('trims surrounding whitespace', () => {
      const document = new Document('  529.982.247-25  ');

      expect(document.getValue()).toBe('52998224725');
    });
  });

  describe('validation', () => {
    it('rejects a CPF with invalid check digits', () => {
      expect(() => new Document('529.982.247-26')).toThrow(
        InvalidDocumentException,
      );
    });

    it('rejects a CNPJ with invalid check digits', () => {
      expect(() => new Document('11.222.333/0001-80')).toThrow(
        InvalidDocumentException,
      );
    });

    it('rejects a CPF with all identical digits', () => {
      expect(() => new Document('111.111.111-11')).toThrow(
        InvalidDocumentException,
      );
    });

    it('rejects an empty document', () => {
      expect(() => new Document('')).toThrow(InvalidDocumentException);
    });

    it('rejects a document with invalid length', () => {
      expect(() => new Document('123')).toThrow(InvalidDocumentException);
    });

    it('rejects a document with non-numeric characters', () => {
      expect(() => new Document('ABC12345678')).toThrow(
        InvalidDocumentException,
      );
    });
  });

  describe('behavior', () => {
    it('is equal to another Document with the same value', () => {
      const first = new Document('529.982.247-25');
      const second = new Document('52998224725');

      expect(first.equals(second)).toBe(true);
    });

    it('is not equal to a Document with a different value', () => {
      const cpf = new Document('529.982.247-25');
      const cnpj = new Document('11.222.333/0001-81');

      expect(cpf.equals(cnpj)).toBe(false);
    });

    it('exposes the normalized value through toString', () => {
      const document = new Document('529.982.247-25');

      expect(document.toString()).toBe('52998224725');
    });
  });
});
