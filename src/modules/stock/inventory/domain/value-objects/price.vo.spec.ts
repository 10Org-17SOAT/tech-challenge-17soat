import { InvalidSupplyError } from '../errors/invalid-supply.error';
import { Price } from './price.vo';

describe('Price', () => {
  it('accepts a non-negative integer amount of cents', () => {
    expect(Price.create(0).inCents).toBe(0);
    expect(Price.create(4990).inCents).toBe(4990);
  });

  it('rejects negative and non-integer amounts', () => {
    expect(() => Price.create(-1)).toThrow(InvalidSupplyError);
    expect(() => Price.create(10.5)).toThrow(InvalidSupplyError);
  });

  it('compares by value', () => {
    expect(Price.create(100).equals(Price.create(100))).toBe(true);
    expect(Price.create(100).equals(Price.create(200))).toBe(false);
  });
});
