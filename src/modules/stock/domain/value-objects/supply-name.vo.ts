import { InvalidSupplyError } from '@/modules/stock/domain/errors/invalid-supply.error';

const MAX_LENGTH = 255;

export class SupplyName {
  private constructor(readonly value: string) {}

  static create(name: string): SupplyName {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new InvalidSupplyError('Supply name must not be empty');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidSupplyError(
        `Supply name must have at most ${MAX_LENGTH} characters`,
      );
    }
    return new SupplyName(trimmed);
  }

  equals(other: SupplyName): boolean {
    return this.value === other.value;
  }
}
