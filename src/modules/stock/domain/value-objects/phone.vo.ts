import { InvalidStockKeeperError } from '../errors/invalid-stock-keeper.error';

// Brazilian phone numbers: DDD (2 digits) + 8 or 9-digit subscriber number.
const MIN_LENGTH = 10;
const MAX_LENGTH = 11;

/**
 * Deliberately simple: a single normalized digit string, unlike the
 * structured {countryCode, areaCode, number} Phone used by `customer` and
 * `mechanic`. Chosen for this module rather than reused across contexts.
 */
export class Phone {
  private constructor(readonly value: string) {}

  static create(raw: string): Phone {
    const digits = raw.replace(/\D/g, '');

    if (digits.length < MIN_LENGTH || digits.length > MAX_LENGTH) {
      throw new InvalidStockKeeperError(`Invalid phone number: "${raw}"`);
    }

    return new Phone(digits);
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }
}
