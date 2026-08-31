import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_SENDER } from '../domain/email-sender.port';
import type { EmailSender } from '../domain/email-sender.port';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { RecipientUnreachableError } from '../domain/errors/recipient-unreachable.error';
import { QUOTATION_RECIPIENT_QUERY } from '../domain/quotation-recipient.port';
import type { QuotationRecipientQuery } from '../domain/quotation-recipient.port';
import { Quotation } from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';
import { renderQuotationApprovalEmail } from '../presentation/quotation-approval-email.template';

/**
 * Mints an approval link and emails it to the customer.
 *
 * Running it again rotates the token: the previous link stops working. That is
 * forced by storing only a hash — the old value cannot be recovered to be sent
 * a second time — and it is the safer behaviour anyway, since a resend usually
 * means the first link went somewhere it should not have.
 */
@Injectable()
export class SendQuotationApprovalEmailUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
    @Inject(QUOTATION_RECIPIENT_QUERY)
    private readonly recipients: QuotationRecipientQuery,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSender,
    private readonly config: ConfigService,
  ) {}

  async execute(quotationId: string): Promise<Quotation> {
    const quotation = await this.quotationRepository.findById(quotationId);
    if (!quotation) {
      throw new QuotationNotFoundError(quotationId);
    }

    const recipient = await this.recipients.findForServiceOrder(
      quotation.serviceOrderId,
    );
    if (!recipient) {
      throw new RecipientUnreachableError(quotation.serviceOrderId);
    }

    const rawToken = quotation.issueApprovalToken();
    // Persisted before the message goes out. The reverse order would let a
    // customer click a link whose token was never stored.
    await this.quotationRepository.save(quotation);

    const baseUrl = this.config.getOrThrow<string>('APP_BASE_URL');
    const approvalUrl = `${baseUrl.replace(/\/+$/, '')}/quotations/approve?token=${encodeURIComponent(rawToken)}`;

    await this.emailSender.send({
      to: recipient.email,
      toName: recipient.name,
      subject: `Orçamento do seu ${recipient.vehicle.manufacturer} ${recipient.vehicle.model} (${recipient.vehicle.licensePlate})`,
      html: renderQuotationApprovalEmail({ quotation, recipient, approvalUrl }),
    });

    // Only after the provider accepted it. A send that threw leaves this null,
    // which is how a swallowed failure stays visible.
    quotation.markApprovalEmailSent();
    await this.quotationRepository.save(quotation);

    return quotation;
  }
}
