import { InvalidStockKeeperError } from '../errors/invalid-stock-keeper.error';

const CPF_LENGTH = 11;

// Check digit weights (mod 11 algorithm)
const FIRST_CHECK_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_CHECK_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export class Cpf {
  private constructor(readonly value: string) {}

  static create(raw: string): Cpf {
    const digits = raw.replace(/\D/g, '');

    if (!Cpf.isValid(digits)) {
      throw new InvalidStockKeeperError(`Invalid CPF: "${raw}"`);
    }

    return new Cpf(digits);
  }

  equals(other: Cpf): boolean {
    return this.value === other.value;
  }

  private static isValid(digits: string): boolean {
    if (digits.length !== CPF_LENGTH) {
      return false;
    }

    if (Cpf.hasAllIdenticalDigits(digits)) {
      return false;
    }

    return (
      Cpf.matchesCheckDigit(digits, FIRST_CHECK_WEIGHTS) &&
      Cpf.matchesCheckDigit(digits, SECOND_CHECK_WEIGHTS)
    );
  }

  private static hasAllIdenticalDigits(digits: string): boolean {
    return /^(\d)\1+$/.test(digits);
  }

  private static matchesCheckDigit(digits: string, weights: number[]): boolean {
    const checkDigitIndex = weights.length;
    const expected = Cpf.calculateCheckDigit(digits, weights);

    return Number(digits[checkDigitIndex]) === expected;
  }

  private static calculateCheckDigit(
    digits: string,
    weights: number[],
  ): number {
    const sum = weights.reduce(
      (acc, weight, index) => acc + Number(digits[index]) * weight,
      0,
    );

    const remainder = sum % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  }
}
