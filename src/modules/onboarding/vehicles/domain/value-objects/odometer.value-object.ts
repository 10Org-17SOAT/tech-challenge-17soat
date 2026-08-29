import { InvalidOdometerException } from '@/modules/onboarding/vehicles/domain/exceptions/vehicle.exceptions';

export class Odometer {
  private readonly value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new InvalidOdometerException(value, 'Must be an integer number.');
    }

    if (value < 0) {
      throw new InvalidOdometerException(value, 'Cannot be negative.');
    }

    if (value > 9999999) {
      throw new InvalidOdometerException(
        value,
        'Exceeds the maximum value of 9999999 km.',
      );
    }

    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  increment(kilometers: number): Odometer {
    if (kilometers < 0) {
      throw new InvalidOdometerException(
        kilometers,
        'Cannot increment by a negative value.',
      );
    }

    return new Odometer(this.value + kilometers);
  }

  equals(other: Odometer): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return `${this.value} km`;
  }
}
