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

  it('rejects a countryCode with non-digits', () => {
    expect(
      () =>
        new Phone({
          countryCode: '5a',
          areaCode: '11',
          number: '912345678',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('rejects a countryCode longer than 3 digits', () => {
    expect(
      () =>
        new Phone({
          countryCode: '1234',
          areaCode: '11',
          number: '912345678',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('rejects an areaCode with a single digit', () => {
    expect(
      () =>
        new Phone({
          countryCode: '55',
          areaCode: '1',
          number: '912345678',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('rejects an areaCode with non-digits', () => {
    expect(
      () =>
        new Phone({
          countryCode: '55',
          areaCode: '1a',
          number: '912345678',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('rejects a number shorter than 7 digits', () => {
    expect(
      () =>
        new Phone({
          countryCode: '55',
          areaCode: '11',
          number: '123456',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('rejects a number longer than 15 digits', () => {
    expect(
      () =>
        new Phone({
          countryCode: '55',
          areaCode: '11',
          number: '1234567890123456',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('rejects a number with non-digits', () => {
    expect(
      () =>
        new Phone({
          countryCode: '55',
          areaCode: '11',
          number: '91234567a',
        }),
    ).toThrow(InvalidPhoneException);
  });

  it('accepts boundary sizes (1-digit country, 2-digit area, 7-digit number)', () => {
    const phone = new Phone({
      countryCode: '1',
      areaCode: '11',
      number: '2025550',
    });

    expect(phone.getCountryCode()).toBe('1');
    expect(phone.getAreaCode()).toBe('11');
    expect(phone.getNumber()).toBe('2025550');
  });

  it('accepts boundary sizes (3-digit country, 3-digit area, 15-digit number)', () => {
    const phone = new Phone({
      countryCode: '999',
      areaCode: '123',
      number: '123456789012345',
    });

    expect(phone.getCountryCode()).toBe('999');
    expect(phone.getAreaCode()).toBe('123');
    expect(phone.getNumber()).toBe('123456789012345');
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
