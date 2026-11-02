import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailSender } from '../domain/email-sender.port';

/**
 * The default driver. Sends nothing and writes the message to the logger, so a
 * fresh clone and the e2e suite exercise the whole flow without an account,
 * an API key or a network.
 */
@Injectable()
export class LogEmailSender implements EmailSender {
  private readonly logger = new Logger(LogEmailSender.name);

  send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `[MAIL_DRIVER=log] Para: ${message.toName} <${message.to}> — ${message.subject}\n${message.html}`,
    );
    return Promise.resolve();
  }
}
