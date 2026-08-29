import { Phone } from './phone.value-object';
import { InvalidPhoneException } from '../exceptions/mechanic.exceptions';

describe('Phone', () => {
  it('accepts a valid phone and exposes its fields', () => {
    const phone = new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });

    expect(phone.getCountryCode()).toBe('55');
    expect(phone.getAreaCode()).toBe('11');
    expect(phone.getNumber()).toBe('912345678');
  });

  it('normalizes an absent areaCode to null', () => {
    const phone = new Phone({
      countryCode: '1',
      number: '2025550147',
    });

    expect(phone.getAreaCode()).toBeNull();
  });

  it('rejects an empty countryCode', () => {
    expect(
      () =>
        new Phone({
          countryCode: '  ',
          areaCode: '11',
          number: '912345678',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('rejects an empty number', () => {
    expect(
      () =>
        new Phone({
          countryCode: '55',
          areaCode: '11',
          number: '',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('is equal to another Phone with the same fields', () => {
    const a = new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });
    const b = new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });

    expect(a.equals(b)).toBe(true);
  });

  it('is not equal to another Phone with a different field', () => {
    const a = new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });
    const b = new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '987654321',
    });

    expect(a.equals(b)).toBe(false);
  });

  it('returns the structured shape via toPrimitives', () => {
    const phone = new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });

    expect(phone.toPrimitives()).toEqual({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });
  });
});
