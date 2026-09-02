import { EmailValueObject } from './email.vo';

class InvalidEmail extends Error {}

const onInvalid = (raw: string) => new InvalidEmail(raw);
const email = (raw: string) => new EmailValueObject(raw, onInvalid);

describe('EmailValueObject', () => {
  describe('normalization', () => {
    it('trims surrounding whitespace and lowercases the value', () => {
      expect(email('  John.Doe@Example.COM ').getValue()).toBe(
        'john.doe@example.com',
      );
    });

    it('accepts dots and plus tags in the local part', () => {
      expect(email('customer.name+tag@example.co.uk').getValue()).toBe(
        'customer.name+tag@example.co.uk',
      );
    });
  });

  describe('validation', () => {
    it.each([
      ['an empty value', ''],
      ['no @ symbol', 'invalid-email'],
      ['no local part', '@example.com'],
      ['no domain', 'customer@'],
      ['no top-level domain', 'customer@example'],
      ['embedded spaces', 'customer @example.com'],
      ['an empty domain label', 'customer@example..com'],
    ])('rejects %s', (_case, raw) => {
      expect(() => email(raw)).toThrow(InvalidEmail);
    });

    it('rejects a long adversarial input in linear time', () => {
      const adversarial = `a@${'b.'.repeat(32_000)} `;

      const startedAt = process.hrtime.bigint();
      expect(() => email(adversarial)).toThrow(InvalidEmail);
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      expect(elapsedMs).toBeLessThan(100);
    });
  });

  describe('behavior', () => {
    it('is equal to another value object with the same normalized value', () => {
      expect(
        email('Customer@Example.COM').equals(email('customer@example.com')),
      ).toBe(true);
    });

    it('is not equal to a different value', () => {
      expect(
        email('customer@example.com').equals(email('other@example.com')),
      ).toBe(false);
    });

    it('exposes the normalized value through toString', () => {
      expect(email('Customer@Example.COM').toString()).toBe(
        'customer@example.com',
      );
    });
  });

  it('raises the error the caller supplies', () => {
    class ModuleSpecificError extends Error {}

    expect(
      () => new EmailValueObject('nope', (raw) => new ModuleSpecificError(raw)),
    ).toThrow(ModuleSpecificError);
  });
});
