import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailMessage, EmailSender } from '../domain/email-sender.port';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Brevo over plain `fetch` — no SDK, because the call is one POST.
 *
 * Brevo was chosen over Resend for one reason: it delivers to any recipient
 * once a single sender address is verified, while Resend needs a whole
 * verified domain and otherwise only mails the account owner. Whoever clones
 * this repo has to be able to email their own customer records.
 */
@Injectable()
export class BrevoEmailSender implements EmailSender {
  constructor(private readonly config: ConfigService) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': this.config.getOrThrow<string>('BREVO_API_KEY'),
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: this.config.getOrThrow<string>('MAIL_FROM'),
          name: this.config.getOrThrow<string>('MAIL_FROM_NAME'),
        },
        to: [{ email: message.to, name: message.toName }],
        subject: message.subject,
        htmlContent: message.html,
      }),
    });

    if (!response.ok) {
      // The body carries Brevo's reason — an unverified sender, a daily quota,
      // a malformed address. Losing it would make every failure look alike.
      const body = await response.text();
      throw new Error(
        `Brevo refused the message (HTTP ${response.status}): ${body}`,
      );
    }
  }
}
