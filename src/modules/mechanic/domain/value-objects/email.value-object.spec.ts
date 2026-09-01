import { Email } from './email.value-object';
import { InvalidEmailException } from '../exceptions/mechanic.exceptions';

describe('Email', () => {
  it('accepts a valid email and stores the normalized value', () => {
    const email = new Email('john.doe@example.com');

    expect(email.getValue()).toBe('john.doe@example.com');
  });

  it('normalizes to trimmed lowercase', () => {
    const email = new Email('  John.Doe@Example.COM ');

    expect(email.getValue()).toBe('john.doe@example.com');
  });

  it('rejects an email without an @', () => {
    expect(() => new Email('john.doe.example.com')).toThrow(
      InvalidEmailException,
    );
  });

  it('rejects an email without a domain', () => {
    expect(() => new Email('john.doe@')).toThrow(InvalidEmailException);
  });

  it('rejects an email with embedded spaces', () => {
    expect(() => new Email('john doe@example.com')).toThrow(
      InvalidEmailException,
    );
  });

  it('rejects an email with an empty domain label', () => {
    expect(() => new Email('john.doe@example..com')).toThrow(
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

  it('is equal to another Email with the same value', () => {
    const a = new Email('john.doe@example.com');
    const b = new Email('  JOHN.DOE@EXAMPLE.COM ');

    expect(a.equals(b)).toBe(true);
  });

  it('is not equal to another Email with a different value', () => {
    const a = new Email('john.doe@example.com');
    const b = new Email('jane.doe@example.com');

    expect(a.equals(b)).toBe(false);
  });
});
