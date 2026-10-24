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

  /** Messages about one status, by the `<orderId>--<status>` tag. Status
   *  emails go out from a listener, so a suite cannot rely on their position
   *  relative to the quotation email. */
  messagesFor(status: string): EmailMessage[] {
    return this.messages.filter((m) => m.tag?.endsWith(`--${status}`));
  }

  /** The approval token as it reached the customer — only recoverable from the
   *  message body, since the quotation stores nothing but its hash. Taken from
   *  the latest message that has one: a status email may have landed after. */
  tokenFromLastLink(): string | null {
    for (const message of [...this.messages].reverse()) {
      const match = /token=([A-Za-z0-9_-]+)/.exec(message.html);
      if (match) return decodeURIComponent(match[1]);
    }
    return null;
  }
}
