import { InvalidPhoneException } from '../exceptions/mechanic.exceptions';

export interface PhoneProps {
  countryCode: string;
  areaCode?: string | null;
  number: string;
}

export class Phone {
  private readonly countryCode: string;
  private readonly areaCode: string | null;
  private readonly number: string;

  constructor(phone: PhoneProps) {
    const normalizedPhone = this.normalize(phone);

    this.validate(normalizedPhone);

    this.countryCode = normalizedPhone.countryCode;
    this.areaCode = normalizedPhone.areaCode ?? null;
    this.number = normalizedPhone.number;
  }

  getCountryCode(): string {
    return this.countryCode;
  }

  getAreaCode(): string | null {
    return this.areaCode;
  }

  getNumber(): string {
    return this.number;
  }

  equals(other: Phone): boolean {
    return (
      this.countryCode === other.getCountryCode() &&
      this.areaCode === other.getAreaCode() &&
      this.number === other.getNumber()
    );
  }

  toPrimitives(): PhoneProps {
    return {
      countryCode: this.countryCode,
      areaCode: this.areaCode,
      number: this.number,
    };
  }

  private normalize(phone: PhoneProps): PhoneProps {
    return {
      countryCode: phone.countryCode.trim(),
      areaCode: phone.areaCode?.trim() || null,
      number: phone.number.trim(),
    };
  }

  private validate(phone: PhoneProps): void {
    if (phone.countryCode.length === 0) {
      throw new InvalidPhoneException('Country code is required.');
    }

    if (phone.number.length === 0) {
      throw new InvalidPhoneException('Phone number is required.');
    }
  }
}