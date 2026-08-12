export class Odometer {
  private readonly value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error('Odometer must be an integer number');
    }

    if (value < 0) {
      throw new Error('Odometer cannot be negative');
    }

    if (value > 9999999) {
      throw new Error('Odometer exceeds maximum value (9999999 km)');
    }

    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  increment(kilometers: number): Odometer {
    if (kilometers < 0) {
      throw new Error('Cannot increment by negative value');
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
