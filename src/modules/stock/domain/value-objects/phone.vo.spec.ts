import { InvalidStockKeeperError } from '../errors/invalid-stock-keeper.error';
import { Phone } from './phone.vo';

describe('Phone', () => {
  it('accepts a valid phone number with area code', () => {
    expect(Phone.create('11987654321').value).toBe('11987654321');
  });

  it('normalizes formatted input to digits only', () => {
    expect(Phone.create('(11) 98765-4321').value).toBe('11987654321');
  });

  it('accepts a landline-length number', () => {
    expect(Phone.create('1133224455').value).toBe('1133224455');
  });

  it('rejects a number shorter than a landline', () => {
    expect(() => Phone.create('123456789')).toThrow(InvalidStockKeeperError);
  });

  it('rejects a number longer than a mobile number with area code', () => {
    expect(() => Phone.create('119876543210')).toThrow(
      InvalidStockKeeperError,
    );
  });

  it('compares by normalized value', () => {
    expect(
      Phone.create('11987654321').equals(Phone.create('(11) 98765-4321')),
    ).toBe(true);
    expect(
      Phone.create('11987654321').equals(Phone.create('11912345678')),
    ).toBe(false);
  });
});
