import { InvalidLicensePlateException } from '../exceptions/vehicle.exceptions';

export class LicensePlate {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidLicensePlateException(value);
    }

    const normalizedValue = this.normalize(value);

    if (!this.isValidBrazilianPlate(normalizedValue)) {
      throw new InvalidLicensePlateException(normalizedValue);
    }

    this.value = normalizedValue;
  }

  private normalize(plate: string): string {
    return plate.toUpperCase().trim();
  }

  private isValidBrazilianPlate(plate: string): boolean {
    // Old format: AAA-0000 or AAA0000
    const oldFormatRegex = /^[A-Z]{3}-?\d{4}$/;
    // Mercosul format: AAA0B00
    const mercosulFormatRegex = /^[A-Z]{3}\d[A-Z]\d{2}$/;

    return oldFormatRegex.test(plate) || mercosulFormatRegex.test(plate);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LicensePlate): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}
