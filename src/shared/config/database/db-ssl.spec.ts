import { dbSslSchema } from './db-ssl';

describe('dbSslSchema', () => {
  it('is off when DB_SSL is absent', () => {
    expect(dbSslSchema.parse(undefined)).toBe(false);
  });

  it('is off when DB_SSL is left blank', () => {
    expect(dbSslSchema.parse('')).toBe(false);
  });

  it('is on only for the literal "true"', () => {
    expect(dbSslSchema.parse('true')).toBe(true);
    expect(dbSslSchema.parse('false')).toBe(false);
  });

  it('rejects anything else instead of guessing', () => {
    // A boolean coercion would read "0" and "no" as true, turning SSL on (or
    // a typo off) without anyone noticing.
    for (const value of ['1', '0', 'yes', 'TRUE', 'on']) {
      expect(dbSslSchema.safeParse(value).success).toBe(false);
    }
  });
});
