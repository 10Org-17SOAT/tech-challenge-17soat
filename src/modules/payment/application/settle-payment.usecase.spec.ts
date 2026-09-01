import { randomUUID } from 'node:crypto';
import { PaymentReceived } from '../domain/events/payment-received.event';
import { ServiceOrderAlreadyPaidError } from '../domain/errors/service-order-already-paid.error';
import { ServiceOrderNotFoundForPaymentError } from '../domain/errors/service-order-not-found-for-payment.error';
import { ServiceOrderNotPayableError } from '../domain/errors/service-order-not-payable.error';
import { InMemoryPaymentRepository } from '../__test__/in-memory-payment.repository';
import { InMemoryServiceOrderBillingQuery } from '../__test__/in-memory-service-order-billing.query';
import { RecordingDomainEventPublisher } from '../__test__/recording-domain-event.publisher';
import { SettlePaymentUseCase } from './settle-payment.usecase';

describe('SettlePaymentUseCase', () => {
  let paymentRepository: InMemoryPaymentRepository;
  let billingQuery: InMemoryServiceOrderBillingQuery;
  let publisher: RecordingDomainEventPublisher;
  let useCase: SettlePaymentUseCase;

  beforeEach(() => {
    paymentRepository = new InMemoryPaymentRepository();
    billingQuery = new InMemoryServiceOrderBillingQuery();
    publisher = new RecordingDomainEventPublisher();
    useCase = new SettlePaymentUseCase(
      billingQuery,
      paymentRepository,
      publisher,
    );
  });

  it('settles a payable order for the quoted total and publishes PaymentReceived', async () => {
    const serviceOrderId = randomUUID();
    billingQuery.billings.set(serviceOrderId, {
      serviceOrderId,
      payable: true,
      totalInCents: 45000,
    });

    const payment = await useCase.execute(serviceOrderId);

    expect(payment.serviceOrderReference).toBe(serviceOrderId);
    expect(payment.amountInCents).toBe(45000);

    expect(publisher.events).toHaveLength(1);
    const [event] = publisher.events as [PaymentReceived];
    expect(event).toBeInstanceOf(PaymentReceived);
    expect(event.serviceOrderId).toBe(serviceOrderId);
  });

  it('rejects an order that does not exist or was never quoted', async () => {
    await expect(useCase.execute(randomUUID())).rejects.toBeInstanceOf(
      ServiceOrderNotFoundForPaymentError,
    );
    expect(publisher.events).toEqual([]);
  });

  it('rejects an order that is not payable yet, without publishing', async () => {
    const serviceOrderId = randomUUID();
    billingQuery.billings.set(serviceOrderId, {
      serviceOrderId,
      payable: false,
      totalInCents: 45000,
    });

    await expect(useCase.execute(serviceOrderId)).rejects.toBeInstanceOf(
      ServiceOrderNotPayableError,
    );
    expect(publisher.events).toEqual([]);
  });

  it('rejects a second payment for an order already paid', async () => {
    const serviceOrderId = randomUUID();
    billingQuery.billings.set(serviceOrderId, {
      serviceOrderId,
      payable: true,
      totalInCents: 45000,
    });

    await useCase.execute(serviceOrderId);

    await expect(useCase.execute(serviceOrderId)).rejects.toBeInstanceOf(
      ServiceOrderAlreadyPaidError,
    );
    expect(publisher.events).toHaveLength(1);
  });
});
