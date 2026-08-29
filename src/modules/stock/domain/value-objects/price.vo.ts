import { InvalidSupplyError } from '@/modules/stock/domain/errors/invalid-supply.error';

export class Price {
  private constructor(readonly inCents: number) {}

  static create(inCents: number): Price {
    if (!Number.isInteger(inCents) || inCents < 0) {
      throw new InvalidSupplyError(
        'Supply price must be a non-negative integer amount of cents',
      );
    }
    return new Price(inCents);
  }

  equals(other: Price): boolean {
    return this.inCents === other.inCents;
  }
}
