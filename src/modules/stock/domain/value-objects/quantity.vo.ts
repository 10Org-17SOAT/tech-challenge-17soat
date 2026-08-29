import { InvalidStockMovementError } from '@/modules/stock/domain/errors/invalid-stock-movement.error';

export class Quantity {
  private constructor(readonly units: number) {}

  static create(units: number): Quantity {
    if (!Number.isInteger(units) || units <= 0) {
      throw new InvalidStockMovementError(
        'Stock movement quantity must be a positive integer number of units',
      );
    }
    return new Quantity(units);
  }

  equals(other: Quantity): boolean {
    return this.units === other.units;
  }
}
