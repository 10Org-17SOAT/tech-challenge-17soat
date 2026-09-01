import { Email } from './email.value-object';
import { InvalidEmailException } from '../exceptions/customer.exceptions';

describe('Email value object', () => {
  describe('creation', () => {
    it('creates a valid email and normalizes it to lowercase', () => {
      const email = new Email('Customer@Example.COM');

      expect(email.getValue()).toBe('customer@example.com');
    });

    it('trims surrounding whitespace', () => {
      const email = new Email('  customer@example.com  ');

      expect(email.getValue()).toBe('customer@example.com');
    });

    it('accepts emails with dots and plus tags', () => {
      const email = new Email('customer.name+tag@example.co.uk');

      expect(email.getValue()).toBe('customer.name+tag@example.co.uk');
    });
  });

  describe('validation', () => {
    it('rejects an empty email', () => {
      expect(() => new Email('')).toThrow(InvalidEmailException);
    });

    it('rejects an email without the @ symbol', () => {
      expect(() => new Email('invalid-email')).toThrow(InvalidEmailException);
    });

    it('rejects an email without a local part', () => {
      expect(() => new Email('@example.com')).toThrow(InvalidEmailException);
    });

    it('rejects an email without a domain', () => {
      expect(() => new Email('customer@')).toThrow(InvalidEmailException);
    });

    it('rejects an email without a top-level domain', () => {
      expect(() => new Email('customer@example')).toThrow(
        InvalidEmailException,
      );
    });

    it('rejects an email with spaces', () => {
      expect(() => new Email('customer @example.com')).toThrow(
        InvalidEmailException,
      );
    });

    it('rejects an email with an empty domain label', () => {
      expect(() => new Email('customer@example..com')).toThrow(
        InvalidEmailException,
      );
    });

    it('rejects a long adversarial input in linear time', () => {
      const adversarial = `a@${'b.'.repeat(32_000)} `;

      const startedAt = process.hrtime.bigint();
      expect(() => new Email(adversarial)).toThrow(InvalidEmailException);
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      expect(elapsedMs).toBeLessThan(100);
    });
  });

  describe('behavior', () => {
    it('is equal to another Email with the same value', () => {
      const first = new Email('Customer@Example.COM');
      const second = new Email('customer@example.com');

      expect(first.equals(second)).toBe(true);
    });

    it('is not equal to an Email with a different value', () => {
      const first = new Email('customer@example.com');
      const second = new Email('other@example.com');

      expect(first.equals(second)).toBe(false);
    });

    it('exposes the normalized value through toString', () => {
      const email = new Email('Customer@Example.COM');

      expect(email.toString()).toBe('customer@example.com');
    });
  });
});
