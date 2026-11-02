import { validateEnv } from './env.validation';

const base = { JWT_SECRET: 'x'.repeat(32) };

describe('validateEnv', () => {
  it.each(['log', 'file', 'brevo'])('accepts MAIL_DRIVER=%s', (driver) => {
    expect(
      validateEnv({ ...base, MAIL_DRIVER: driver, BREVO_API_KEY: 'key' }),
    ).toMatchObject({ MAIL_DRIVER: driver });
  });

  it('defaults MAIL_DIRECTORY for the file driver', () => {
    expect(validateEnv(base)).toMatchObject({
      MAIL_DRIVER: 'log',
      MAIL_DIRECTORY: 'var/mail',
    });
  });

  it('fails at boot on an unknown MAIL_DRIVER, naming the variable', () => {
    expect(() => validateEnv({ ...base, MAIL_DRIVER: 'smtp' })).toThrow(
      /MAIL_DRIVER: .*"log"\|"file"\|"brevo"/,
    );
  });
});
