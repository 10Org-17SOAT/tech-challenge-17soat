import { randomUUID } from 'crypto';

export class VehicleId {
  private readonly value: string;

  constructor(value?: string) {
    if (value && !this.isValidUUID(value)) {
      throw new Error('VehicleId must be a valid UUID');
    }
    this.value = value || randomUUID();
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: VehicleId): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}
