import { InvalidCpfException } from '../exceptions/mechanic.exceptions';

const CPF_LENGTH = 11;

// Check digit weights (mod 11 algorithm)
const CPF_FIRST_CHECK_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_SECOND_CHECK_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export class Cpf {
  private readonly value: string;

  constructor(value: string) {
    const normalized = this.normalize(value);

    if (!this.isValid(normalized)) {
      throw new InvalidCpfException(value);
    }

    this.value = normalized;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Cpf): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }

  private normalize(value: string): string {
    return value.replace(/\D/g, '');
  }

  private isValid(digits: string): boolean {
    if (digits.length !== CPF_LENGTH) {
      return false;
    }

    if (this.hasAllIdenticalDigits(digits)) {
      return false;
    }

    return (
      this.matchesCheckDigit(digits, CPF_FIRST_CHECK_WEIGHTS) &&
      this.matchesCheckDigit(digits, CPF_SECOND_CHECK_WEIGHTS)
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
