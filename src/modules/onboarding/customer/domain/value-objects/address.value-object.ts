import { InvalidAddressException } from '../exceptions/customer.exceptions';

const STATE_REGEX = /^[A-Z]{2}$/;
const ZIPCODE_REGEX = /^\d{8}$/;

export interface AddressProps {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export class Address {
  private readonly street: string;
  private readonly number: string;
  private readonly complement: string | null;
  private readonly neighborhood: string;
  private readonly city: string;
  private readonly state: string;
  private readonly zipCode: string;

  constructor(props: AddressProps) {
    const normalized = this.normalize(props);
    this.validate(normalized);

    this.street = normalized.street;
    this.number = normalized.number;
    this.complement = normalized.complement ?? null;
    this.neighborhood = normalized.neighborhood;
    this.city = normalized.city;
    this.state = normalized.state;
    this.zipCode = normalized.zipCode;
  }

  getStreet(): string {
    return this.street;
  }

  getNumber(): string {
    return this.number;
  }

  getComplement(): string | null {
    return this.complement;
  }

  getNeighborhood(): string {
    return this.neighborhood;
  }

  getCity(): string {
    return this.city;
  }

  getState(): string {
    return this.state;
  }

  getZipCode(): string {
    return this.zipCode;
  }

  equals(other: Address): boolean {
    return (
      this.street === other.getStreet() &&
      this.number === other.getNumber() &&
      this.complement === other.getComplement() &&
      this.neighborhood === other.getNeighborhood() &&
      this.city === other.getCity() &&
      this.state === other.getState() &&
      this.zipCode === other.getZipCode()
    );
  }

  toPrimitives(): {
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  } {
    return {
      street: this.street,
      number: this.number,
      complement: this.complement,
      neighborhood: this.neighborhood,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
    };
  }

  toString(): string {
    const base = `${this.street}, ${this.number}`;
    const withComplement = this.complement
      ? `${base}, ${this.complement}`
      : base;
    return `${withComplement}, ${this.neighborhood}, ${this.city}/${this.state}, ${this.zipCode}`;
  }

  private normalize(props: AddressProps): AddressProps {
    return {
      street: props.street.trim(),
      number: props.number.trim(),
      complement: props.complement?.trim() ?? null,
      neighborhood: props.neighborhood.trim(),
      city: props.city.trim(),
      state: props.state.trim().toUpperCase(),
      zipCode: props.zipCode.replace(/\D/g, ''),
    };
  }

  private validate(props: AddressProps): void {
    if (!props.street) {
      throw new InvalidAddressException('Street is required.');
    }
    if (!props.number) {
      throw new InvalidAddressException('Number is required.');
    }
    if (!props.neighborhood) {
      throw new InvalidAddressException('Neighborhood is required.');
    }
    if (!props.city) {
      throw new InvalidAddressException('City is required.');
    }
    if (!props.state) {
      throw new InvalidAddressException('State is required.');
    }
    if (!STATE_REGEX.test(props.state)) {
      throw new InvalidAddressException(
        `Invalid state: "${props.state}". Must be exactly 2 letters.`,
      );
    }
    if (!props.zipCode) {
      throw new InvalidAddressException('Zip code is required.');
    }
    if (!ZIPCODE_REGEX.test(props.zipCode)) {
      throw new InvalidAddressException(
        `Invalid zip code: "${props.zipCode}". Must be exactly 8 digits.`,
      );
    }
  }
}
