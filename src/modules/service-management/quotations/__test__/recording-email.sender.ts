import type { EmailMessage, EmailSender } from '../domain/email-sender.port';

/** Test double that keeps what was sent, so specs can assert on it. */
export class RecordingEmailSender implements EmailSender {
  readonly messages: EmailMessage[] = [];
  /** Set to make the next sends reject, standing in for a provider outage. */
  failure: Error | null = null;

  send(message: EmailMessage): Promise<void> {
    if (this.failure) return Promise.reject(this.failure);
    this.messages.push(message);
    return Promise.resolve();
  }

  get lastMessage(): EmailMessage | undefined {
    return this.messages.at(-1);
  }

  /** The approval token as it reached the customer — only recoverable from the
   *  message body, since the quotation stores nothing but its hash. */
  tokenFromLastLink(): string | null {
    const match = /token=([A-Za-z0-9_-]+)/.exec(this.lastMessage?.html ?? '');
    return match ? decodeURIComponent(match[1]) : null;
  }
}
