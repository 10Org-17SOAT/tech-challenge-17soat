import { ConfigService } from '@nestjs/config';
import { BrevoEmailSender } from './brevo-email-sender';
import { createEmailSender } from './email-sender.factory';
import { FileEmailSender } from './file-email-sender';
import { LogEmailSender } from './log-email-sender';

const configWith = (values: Record<string, string>) =>
  new ConfigService({
    MAIL_FROM: 'oficina@example.com',
    MAIL_FROM_NAME: 'Oficina',
    ...values,
  });

describe('createEmailSender', () => {
  it.each([
    ['log', LogEmailSender],
    ['file', FileEmailSender],
    ['brevo', BrevoEmailSender],
  ])('builds the %s driver', (driver, type) => {
    expect(
      createEmailSender(configWith({ MAIL_DRIVER: driver })),
    ).toBeInstanceOf(type);
  });

  it('defaults to log', () => {
    expect(createEmailSender(configWith({}))).toBeInstanceOf(LogEmailSender);
  });

  it('refuses an unknown driver instead of sending nothing', () => {
    expect(() =>
      createEmailSender(configWith({ MAIL_DRIVER: 'smtp' })),
    ).toThrow('Unknown MAIL_DRIVER "smtp"');
  });
});
