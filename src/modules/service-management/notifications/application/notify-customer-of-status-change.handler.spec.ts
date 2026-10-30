import { Logger } from '@nestjs/common';
import { ServiceOrderStatusChanged } from '../../service-orders/domain/events/service-order-status-changed.event';
import type { ServiceOrderStatus } from '../../service-orders/domain/service-order.entity';
import {
  makeRecipient,
  InMemoryOrderRecipientQuery,
} from '../__test__/in-memory-order-recipient.query';
import { RecordingEmailSender } from '../__test__/recording-email.sender';
import { HtmlStatusChangeEmailComposer } from '../presentation/status-change-email.template';
import { NotifyCustomerOfStatusChangeHandler } from './notify-customer-of-status-change.handler';

const ORDER_ID = '0d9b6c1e-2f3a-4b5c-8d7e-9f0a1b2c3d4e';

const changedTo = (
  to: ServiceOrderStatus,
  from: ServiceOrderStatus | null = null,
) =>
  new ServiceOrderStatusChanged(
    ORDER_ID,
    from,
    to,
    new Date('2026-10-24T13:00:00Z'),
  );

describe('NotifyCustomerOfStatusChangeHandler', () => {
  let recipients: InMemoryOrderRecipientQuery;
  let emails: RecordingEmailSender;
  let handler: NotifyCustomerOfStatusChangeHandler;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    recipients = new InMemoryOrderRecipientQuery();
    recipients.set(ORDER_ID, makeRecipient());
    emails = new RecordingEmailSender();
    handler = new NotifyCustomerOfStatusChangeHandler(
      recipients,
      emails,
      new HtmlStatusChangeEmailComposer(),
    );
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['received', 'Recebida'],
    ['in_diagnosis', 'Em diagnóstico'],
    ['awaiting_execution', 'Aguardando execução'],
    ['in_execution', 'Em execução'],
    ['finished', 'Finalizada'],
    ['delivered', 'Entregue'],
  ] as const)(
    'emails the customer when the order reaches %s',
    async (status, label) => {
      await handler.handle(changedTo(status));

      expect(emails.messages).toHaveLength(1);
      const message = emails.lastMessage!;
      expect(message.to).toBe('ana@example.com');
      expect(message.toName).toBe('Ana Souza');
      expect(message.subject).toBe(`${label}: Fiat Uno (ABC-1234)`);
      expect(message.html).toContain(label);
      expect(message.html).toContain(ORDER_ID);
      expect(message.html).toContain('ABC-1234');
      expect(message.tag).toBe(`${ORDER_ID}--${status}`);
    },
  );

  it('leaves awaiting_approval to the quotation email', async () => {
    await handler.handle(changedTo('awaiting_approval', 'in_diagnosis'));

    expect(emails.messages).toEqual([]);
  });

  it('escapes every customer-supplied value', async () => {
    recipients.set(
      ORDER_ID,
      makeRecipient({
        name: '<script>alert(1)</script>',
        vehicle: {
          manufacturer: '<b>Fiat</b>',
          model: 'Uno"',
          year: 2018,
          licensePlate: "ABC'1234",
        },
      }),
    );

    await handler.handle(changedTo('received'));

    const html = emails.lastMessage!.html;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Fiat</b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;Fiat&lt;/b&gt;');
    expect(html).toContain('Uno&quot;');
    expect(html).toContain('ABC&#39;1234');
  });

  it('skips with a warning when the order has no reachable customer', async () => {
    recipients = new InMemoryOrderRecipientQuery();
    handler = new NotifyCustomerOfStatusChangeHandler(
      recipients,
      emails,
      new HtmlStatusChangeEmailComposer(),
    );

    await expect(
      handler.handle(changedTo('received')),
    ).resolves.toBeUndefined();

    expect(emails.messages).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: ORDER_ID, status: 'received' }),
    );
  });

  it('skips with a warning when the customer has no email', async () => {
    recipients.set(ORDER_ID, makeRecipient({ email: '' }));

    await handler.handle(changedTo('in_diagnosis', 'received'));

    expect(emails.messages).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: ORDER_ID, status: 'in_diagnosis' }),
    );
  });

  it('logs a provider failure with the order and status instead of throwing', async () => {
    emails.failure = new Error('Brevo refused the message (HTTP 401)');

    await expect(
      handler.handle(changedTo('finished', 'in_execution')),
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith({
      message: 'Status change email failed to send',
      orderId: ORDER_ID,
      status: 'finished',
      reason: 'Brevo refused the message (HTTP 401)',
    });
  });
});
