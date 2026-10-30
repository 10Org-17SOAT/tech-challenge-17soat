import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ServiceOrderStatusChanged } from '../../service-orders/domain/events/service-order-status-changed.event';
import { EMAIL_SENDER } from '../domain/email-sender.port';
import type { EmailSender } from '../domain/email-sender.port';
import { ORDER_RECIPIENT_QUERY } from '../domain/order-recipient.port';
import type { OrderRecipientQuery } from '../domain/order-recipient.port';
import { STATUS_CHANGE_EMAIL_COMPOSER } from '../domain/status-change-email.port';
import type { StatusChangeEmailComposer } from '../domain/status-change-email.port';

/**
 * Emails the customer every time their order changes status.
 *
 * Never throws. The status is already persisted by the time this runs, and a
 * provider outage must not turn into an unhandled rejection on the emitter —
 * a failed send is a log line with the order and the status, and retrying it
 * is a separate concern.
 */
@Injectable()
export class NotifyCustomerOfStatusChangeHandler {
  private readonly logger = new Logger(
    NotifyCustomerOfStatusChangeHandler.name,
  );

  constructor(
    @Inject(ORDER_RECIPIENT_QUERY)
    private readonly recipients: OrderRecipientQuery,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSender,
    @Inject(STATUS_CHANGE_EMAIL_COMPOSER)
    private readonly composer: StatusChangeEmailComposer,
  ) {}

  @OnEvent('service-order.status-changed')
  async handle(event: ServiceOrderStatusChanged): Promise<void> {
    const { serviceOrderId: orderId, to: status } = event;

    // The quotation email is this status's notification: it already tells
    // the customer the order is waiting on them, and carries the link to act
    // on it. A second email saying the same thing without the link is noise.
    if (status === 'awaiting_approval') return;

    try {
      const recipient = await this.recipients.findForServiceOrder(orderId);
      if (!recipient?.email) {
        this.logger.warn({
          message:
            'Status change not emailed: no customer email found for the order',
          orderId,
          status,
        });
        return;
      }

      const { subject, html } = this.composer.compose({
        serviceOrderId: orderId,
        status,
        occurredAt: event.occurredAt,
        recipient,
      });

      await this.emailSender.send({
        to: recipient.email,
        toName: recipient.name,
        subject,
        html,
        tag: `${orderId}--${status}`,
      });
    } catch (error) {
      this.logger.error({
        message: 'Status change email failed to send',
        orderId,
        status,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
