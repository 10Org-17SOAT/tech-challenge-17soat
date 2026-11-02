import { InvalidStockMovementError } from '../errors/invalid-stock-movement.error';
import { Quantity } from './quantity.vo';

describe('Quantity', () => {
  it('creates a quantity from a positive integer', () => {
    expect(Quantity.create(3).units).toBe(3);
  });

  it('rejects zero', () => {
    expect(() => Quantity.create(0)).toThrow(InvalidStockMovementError);
  });

  it('rejects a negative amount', () => {
    expect(() => Quantity.create(-1)).toThrow(InvalidStockMovementError);
  });

  it('rejects a fractional amount', () => {
    expect(() => Quantity.create(1.5)).toThrow(InvalidStockMovementError);
  });

  it('compares by value', () => {
    expect(Quantity.create(2).equals(Quantity.create(2))).toBe(true);
    expect(Quantity.create(2).equals(Quantity.create(3))).toBe(false);
  });
});
