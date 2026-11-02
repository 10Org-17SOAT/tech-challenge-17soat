import type { ServiceOrderStatus } from '../../service-orders/domain/service-order.entity';
import type { OrderRecipient } from './order-recipient.port';

export interface StatusChangeEmailInput {
  serviceOrderId: string;
  status: ServiceOrderStatus;
  occurredAt: Date;
  recipient: OrderRecipient;
}

export interface ComposedEmail {
  subject: string;
  html: string;
}

/**
 * Turns a status change into the words the customer reads. A port so the
 * handler decides *whether* and *to whom* to write, and never *how it looks*:
 * the wording and the markup live in `presentation/`, which implements this.
 */
export interface StatusChangeEmailComposer {
  compose(input: StatusChangeEmailInput): ComposedEmail;
}

export const STATUS_CHANGE_EMAIL_COMPOSER = Symbol(
  'STATUS_CHANGE_EMAIL_COMPOSER',
);
