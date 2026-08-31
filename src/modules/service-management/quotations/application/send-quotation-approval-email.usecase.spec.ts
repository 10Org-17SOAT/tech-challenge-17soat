import { ConfigService } from '@nestjs/config';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { RecipientUnreachableError } from '../domain/errors/recipient-unreachable.error';
import { Quotation } from '../domain/quotation.entity';
import {
  aRecipient,
  InMemoryQuotationRecipientQuery,
} from '../__test__/in-memory-quotation-recipient.query';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { RecordingEmailSender } from '../__test__/recording-email.sender';
import { SendQuotationApprovalEmailUseCase } from './send-quotation-approval-email.usecase';

describe('SendQuotationApprovalEmailUseCase', () => {
  let quotations: InMemoryQuotationRepository;
  let recipients: InMemoryQuotationRecipientQuery;
  let emails: RecordingEmailSender;
  let useCase: SendQuotationApprovalEmailUseCase;
  let quotation: Quotation;

  const order = ServiceOrder.create({
    vehicleId: '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11',
  });

  beforeEach(async () => {
    quotations = new InMemoryQuotationRepository();
    recipients = new InMemoryQuotationRecipientQuery();
    emails = new RecordingEmailSender();
    useCase = new SendQuotationApprovalEmailUseCase(
      quotations,
      recipients,
      emails,
      new ConfigService({ APP_BASE_URL: 'https://oficina.example.com' }),
    );

    quotation = Quotation.issue({
      serviceOrderId: order.id,
      items: [
        {
          kind: 'labor',
          referenceId: '22222222-2222-2222-2222-222222222222',
          nameSnapshot: 'Troca de oleo',
          unitPriceInCents: 9990,
          quantity: 1,
        },
      ],
    });
    await quotations.save(quotation);
    recipients.set(order.id, aRecipient());
  });

  it('sends the quotation to the vehicle owner', async () => {
    await useCase.execute(quotation.id);

    expect(emails.messages).toHaveLength(1);
    expect(emails.lastMessage!.to).toBe('ana@example.com');
    expect(emails.lastMessage!.toName).toBe('Ana Souza');
    expect(emails.lastMessage!.subject).toContain('ABC-1234');
  });

  it('itemises the quotation and its total in the message', async () => {
    await useCase.execute(quotation.id);

    expect(emails.lastMessage!.html).toContain('Troca de oleo');
    expect(emails.lastMessage!.html).toContain('99,90');
  });

  it('builds the approval link from APP_BASE_URL, not from a request', async () => {
    await useCase.execute(quotation.id);

    const token = emails.tokenFromLastLink();
    expect(token).not.toBeNull();
    expect(emails.lastMessage!.html).toContain(
      `https://oficina.example.com/quotations/approve?token=${encodeURIComponent(token!)}`,
    );
  });

  // The link is only usable if the hash was written first.
  it('persists the token before the message goes out', async () => {
    await useCase.execute(quotation.id);

    const stored = await quotations.findById(quotation.id);
    expect(stored!.approvalTokenHash).toBe(
      Quotation.hashApprovalToken(emails.tokenFromLastLink()!),
    );
  });

  it('marks the quotation as emailed only after the provider accepted it', async () => {
    await useCase.execute(quotation.id);

    expect(quotation.approvalEmailSentAt).not.toBeNull();
  });

  it('leaves approvalEmailSentAt null when the provider refuses', async () => {
    emails.failure = new Error('Brevo is down');

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      'Brevo is down',
    );

    const stored = await quotations.findById(quotation.id);
    expect(stored!.approvalEmailSentAt).toBeNull();
    // The token was still written, so a resend is not required to recover.
    expect(stored!.approvalTokenHash).not.toBeNull();
  });

  it('rotates the token on every send', async () => {
    await useCase.execute(quotation.id);
    const firstToken = emails.tokenFromLastLink();

    await useCase.execute(quotation.id);
    const secondToken = emails.tokenFromLastLink();

    expect(secondToken).not.toBe(firstToken);
    expect(emails.messages).toHaveLength(2);
  });

  it('refuses to send when the customer cannot be reached', async () => {
    recipients.set(order.id, undefined as never);

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      RecipientUnreachableError,
    );
    expect(emails.messages).toHaveLength(0);
  });

  it('throws for an unknown quotation', async () => {
    await expect(
      useCase.execute('99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow(QuotationNotFoundError);
  });
});
