import { InvalidDocumentException } from '@/modules/onboarding/customer/domain/exceptions/customer.exceptions';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;

// Check digit weights (mod 11 algorithm)
const CPF_FIRST_CHECK_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_SECOND_CHECK_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FIRST_CHECK_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_CHECK_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export class Document {
  private readonly value: string;
  private readonly type: PersonType;

  constructor(value: string) {
    const normalized = this.normalize(value);

    if (!this.isValid(normalized)) {
      throw new InvalidDocumentException(value);
    }

    this.value = normalized;
    this.type =
      normalized.length === CPF_LENGTH ? PersonType.CPF : PersonType.CNPJ;
  }

  getValue(): string {
    return this.value;
  }

  getType(): PersonType {
    return this.type;
  }

  equals(other: Document): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }

  private normalize(value: string): string {
    return value.replace(/\D/g, '');
  }

  private isValid(digits: string): boolean {
    if (digits.length === CPF_LENGTH) {
      return this.isValidCPF(digits);
    }

    if (digits.length === CNPJ_LENGTH) {
      return this.isValidCNPJ(digits);
    }

    return false;
  }

  private isValidCPF(cpf: string): boolean {
    if (this.hasAllIdenticalDigits(cpf)) {
      return false;
    }

    return (
      this.matchesCheckDigit(cpf, CPF_FIRST_CHECK_WEIGHTS) &&
      this.matchesCheckDigit(cpf, CPF_SECOND_CHECK_WEIGHTS)
    );
  }

  private isValidCNPJ(cnpj: string): boolean {
    if (this.hasAllIdenticalDigits(cnpj)) {
      return false;
    }

    return (
      this.matchesCheckDigit(cnpj, CNPJ_FIRST_CHECK_WEIGHTS) &&
      this.matchesCheckDigit(cnpj, CNPJ_SECOND_CHECK_WEIGHTS)
    );
  }

  private hasAllIdenticalDigits(digits: string): boolean {
    return /^(\d)\1+$/.test(digits);
  }

  private matchesCheckDigit(digits: string, weights: number[]): boolean {
    const checkDigitIndex = weights.length;
    const expected = this.calculateCheckDigit(digits, weights);

    return Number(digits[checkDigitIndex]) === expected;
  }

  private calculateCheckDigit(digits: string, weights: number[]): number {
    const sum = weights.reduce(
      (acc, weight, index) => acc + Number(digits[index]) * weight,
      0,
    );

    const remainder = sum % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  }
}
