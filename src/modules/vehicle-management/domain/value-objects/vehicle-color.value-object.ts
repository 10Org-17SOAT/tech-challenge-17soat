export class VehicleColor {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Color cannot be empty');
    }

    if (value.trim().length > 50) {
      throw new Error('Color must not exceed 50 characters');
    }

    this.value = value.trim();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: VehicleColor): boolean {
    return this.value.toLowerCase() === other.getValue().toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}
