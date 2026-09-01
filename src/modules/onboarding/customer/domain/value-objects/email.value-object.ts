import { InvalidEmailException } from '../exceptions/customer.exceptions';

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export class Email {
  private readonly value: string;

  constructor(value: string) {
    const normalized = this.normalize(value);

    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailException(value);
    }

    this.value = normalized;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }
}
