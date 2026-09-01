import { InvalidConsultantError } from '../errors/invalid-consultant.error';

// Brazilian phone numbers: DDD (2 digits) + 8 or 9-digit subscriber number.
const MIN_LENGTH = 10;
const MAX_LENGTH = 11;

/**
 * Deliberately simple: a single normalized digit string, mirroring the
 * stock keeper's Phone rather than the structured
 * {countryCode, areaCode, number} Phone used by `customer`.
 */
export class Phone {
  private constructor(readonly value: string) {}

  static create(raw: string): Phone {
    const digits = raw.replace(/\D/g, '');

    if (digits.length < MIN_LENGTH || digits.length > MAX_LENGTH) {
      throw new InvalidConsultantError(`Invalid phone number: "${raw}"`);
    }

    return new Phone(digits);
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }
}
