import { Phone } from '@/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { InvalidPhoneException } from '@/modules/onboarding/customer/domain/exceptions/customer.exceptions';

describe('Phone value object', () => {
  describe('creation', () => {
    it('creates a Brazilian mobile phone with DDD', () => {
      const phone = new Phone({
        countryCode: '55',
        areaCode: '11',
        number: '999999999',
      });

      expect(phone.getValue()).toBe('5511999999999');
      expect(phone.getCountryCode()).toBe('55');
      expect(phone.getAreaCode()).toBe('11');
      expect(phone.getNumber()).toBe('999999999');
    });

    it('creates a Brazilian landline with DDD', () => {
      const phone = new Phone({
        countryCode: '55',
        areaCode: '11',
        number: '33333333',
      });

      expect(phone.getValue()).toBe('551133333333');
    });

    it('creates an international phone without DDD', () => {
      const phone = new Phone({
        countryCode: '1',
        number: '2125551234',
      });

      expect(phone.getValue()).toBe('12125551234');
      expect(phone.getAreaCode()).toBeNull();
    });

    it('normalizes country code with + prefix', () => {
      const phone = new Phone({
        countryCode: '+55',
        areaCode: '11',
        number: '999999999',
      });

      expect(phone.getCountryCode()).toBe('55');
    });
  });

  describe('validation — Brazilian DDD rule', () => {
    it('rejects Brazilian phone without DDD', () => {
      expect(
        () =>
          new Phone({
            countryCode: '55',
            number: '999999999',
          }),
      ).toThrow(InvalidPhoneException);
    });

    it('rejects empty country code', () => {
      expect(
        () =>
          new Phone({
            countryCode: '',
            number: '999999999',
          }),
      ).toThrow(InvalidPhoneException);
    });

    it('rejects empty number', () => {
      expect(
        () =>
          new Phone({
            countryCode: '55',
            number: '',
          }),
      ).toThrow(InvalidPhoneException);
    });

    it('rejects non-numeric country code', () => {
      expect(
        () =>
          new Phone({
            countryCode: 'abc',
            number: '999999999',
          }),
      ).toThrow(InvalidPhoneException);
    });

    it('rejects non-numeric number', () => {
      expect(
        () =>
          new Phone({
            countryCode: '55',
            number: 'abc',
          }),
      ).toThrow(InvalidPhoneException);
    });

    it('rejects number that is too short', () => {
      expect(
        () =>
          new Phone({
            countryCode: '55',
            areaCode: '11',
            number: '123',
          }),
      ).toThrow(InvalidPhoneException);
    });

    it('rejects non-numeric area code', () => {
      expect(
        () =>
          new Phone({
            countryCode: '55',
            areaCode: 'abc',
            number: '999999999',
          }),
      ).toThrow(InvalidPhoneException);
    });
  });

  describe('behavior', () => {
    it('is equal to another Phone with the same normalized value', () => {
      const first = new Phone({
        countryCode: '55',
        areaCode: '11',
        number: '999999999',
      });
      const second = new Phone({
        countryCode: '+55',
        areaCode: '11',
        number: '999999999',
      });

      expect(first.equals(second)).toBe(true);
    });

    it('is not equal to a Phone with a different value', () => {
      const first = new Phone({
        countryCode: '55',
        areaCode: '11',
        number: '999999999',
      });
      const second = new Phone({
        countryCode: '55',
        areaCode: '21',
        number: '888888888',
      });

      expect(first.equals(second)).toBe(false);
    });

    it('exposes formatted value through toString', () => {
      const phone = new Phone({
        countryCode: '55',
        areaCode: '11',
        number: '999999999',
      });

      expect(phone.toString()).toBe('+55 11 999999999');
    });
  });
});
