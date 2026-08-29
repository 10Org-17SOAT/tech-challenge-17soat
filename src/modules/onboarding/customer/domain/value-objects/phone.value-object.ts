import { InvalidPhoneException } from '@/modules/onboarding/customer/domain/exceptions/customer.exceptions';

export interface PhoneProps {
  countryCode: string;
  areaCode?: string | null;
  number: string;
}

const MIN_PHONE_LENGTH = 7;

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

  getValue(): string {
    return (
      this.getCountryCode() + (this.getAreaCode() ?? '') + this.getNumber()
    );
  }

  getCountryCode(): string {
    return this.countryCode;
  }

  getAreaCode(): string | null {
    return this.areaCode ?? null;
  }

  getNumber(): string {
    return this.number;
  }

  equals(other: Phone): boolean {
    return this.getValue() === other.getValue();
  }

  toString() {
    return (
      '+' +
      this.getCountryCode() +
      (this.getAreaCode()
        ? ' ' + this.getAreaCode() + ' ' + this.getNumber()
        : ' ' + this.getNumber())
    );
  }

  toPrimitives() {
    return {
      countryCode: this.countryCode,
      areaCode: this.areaCode,
      number: this.number,
    };
  }

  private normalize(phone: PhoneProps): PhoneProps {
    return {
      countryCode: phone.countryCode.replace(/\D/g, ''),
      areaCode: phone.areaCode?.replace(/\D/g, '') ?? null,
      number: phone.number.replace(/\D/g, ''),
    };
  }

  private validate(phone: PhoneProps): void {
    if (!/^\d+$/.test(phone.countryCode)) {
      throw new InvalidPhoneException('CountryCode must be a number.');
    }

    if (!/^\d+$/.test(phone.number)) {
      throw new InvalidPhoneException('Phone Number must be a number.');
    }

    if (phone.countryCode === '55') {
      if (!phone.areaCode) {
        throw new InvalidPhoneException(
          'Area code is required for this country',
        );
      }

      if (!/^\d+$/.test(phone.areaCode)) {
        throw new InvalidPhoneException('AreaCode must be a number.');
      }
    }

    if (phone.number.length < MIN_PHONE_LENGTH) {
      throw new InvalidPhoneException('Phone Number is too short.');
    }
  }
}
