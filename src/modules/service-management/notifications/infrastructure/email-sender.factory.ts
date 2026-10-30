import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../../shared/config/env/env.schema';
import type { EmailSender } from '../domain/email-sender.port';
import { BrevoEmailSender } from './brevo-email-sender';
import { FileEmailSender } from './file-email-sender';
import { LogEmailSender } from './log-email-sender';

/**
 * MAIL_DRIVER to an adapter. The env schema already refuses an unknown driver
 * at boot; the throw at the end is for a caller that skipped that validation,
 * so a typo can never quietly fall back to sending nothing.
 */
export function createEmailSender(config: ConfigService): EmailSender {
  const driver = config.get<string>('MAIL_DRIVER') ?? 'log';

  switch (driver as Env['MAIL_DRIVER']) {
    case 'log':
      return new LogEmailSender();
    case 'file':
      return new FileEmailSender({
        directory: config.get<string>('MAIL_DIRECTORY') ?? 'var/mail',
        from: config.getOrThrow<string>('MAIL_FROM'),
        fromName: config.getOrThrow<string>('MAIL_FROM_NAME'),
      });
    case 'brevo':
      return new BrevoEmailSender(config);
    default:
      throw new Error(
        `Unknown MAIL_DRIVER "${driver}": expected log, file or brevo`,
      );
  }
}
