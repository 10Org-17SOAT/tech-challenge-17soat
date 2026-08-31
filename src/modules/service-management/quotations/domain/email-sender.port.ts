/**
 * How this module hands a message to the outside world.
 *
 * Deliberately dumb: a recipient, a subject and a body. No templates, no
 * provider vocabulary, no delivery receipts. Everything that knows what a
 * quotation looks like stays on this side of the interface, and swapping Brevo
 * for anything else touches one adapter.
 */
export interface EmailMessage {
  to: string;
  toName: string;
  subject: string;
  html: string;
}

export interface EmailSender {
  /** Rejects on failure. Callers decide whether that is fatal — for the
   *  approval email it is not: see CompleteDiagnosisUseCase. */
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
