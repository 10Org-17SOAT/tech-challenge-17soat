import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { InvalidQuotationError } from '../domain/errors/invalid-quotation.error';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { QuotationAlreadyRejectedError } from '../domain/errors/quotation-already-rejected.error';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { QuotationRejected } from '../domain/events/quotation-rejected.event';
import {
  Quotation,
  REJECTION_REASON_MAX_LENGTH,
} from '../domain/quotation.entity';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { RecordingDomainEventPublisher } from '../../__test__/recording-domain-event.publisher';
import { RejectQuotationUseCase } from './reject-quotation.usecase';

const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

describe('RejectQuotationUseCase', () => {
  let quotations: InMemoryQuotationRepository;
  let orders: InMemoryServiceOrderRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: RejectQuotationUseCase;
  let order: ServiceOrder;
  let quotation: Quotation;

  beforeEach(async () => {
    quotations = new InMemoryQuotationRepository();
    orders = new InMemoryServiceOrderRepository();
    publisher = new RecordingDomainEventPublisher();
    useCase = new RejectQuotationUseCase(quotations, orders, publisher);

    order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    await orders.save(order);

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
  });

  it('rejects the quotation and sends the order back to diagnosis', async () => {
    const rejected = await useCase.execute(quotation.id, 'Muito caro');

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectedAt).toBeInstanceOf(Date);
    expect(rejected.rejectionReason).toBe('Muito caro');
    expect(orders.orders.get(order.id)!.status).toBe('in_diagnosis');
    expect(orders.orders.get(order.id)!.approvedByCustomer).toBe(false);
  });

  it('publishes QuotationRejected after both writes', async () => {
    await useCase.execute(quotation.id, 'Muito caro');

    expect(publisher.events).toHaveLength(1);
    const [event] = publisher.events as [QuotationRejected];
    expect(event).toBeInstanceOf(QuotationRejected);
    expect(event.name).toBe('quotation.rejected');
    expect(event.quotationId).toBe(quotation.id);
    expect(event.serviceOrderId).toBe(order.id);
    expect(event.reason).toBe('Muito caro');
  });

  it('accepts a rejection with no reason', async () => {
    const rejected = await useCase.execute(quotation.id);

    expect(rejected.rejectionReason).toBeNull();
  });

  it('refuses a second rejection, without publishing again', async () => {
    await useCase.execute(quotation.id);

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      QuotationAlreadyRejectedError,
    );
    expect(publisher.events).toHaveLength(1);
  });

  it('refuses to reject an approved quotation', async () => {
    quotation.approve();
    await quotations.save(quotation);

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      QuotationAlreadyApprovedError,
    );
    expect(publisher.events).toEqual([]);
  });

  // Both aggregates are mutated in memory before either is written, so an
  // order that cannot go back leaves the quotation open to an answer.
  it('writes nothing when the order is no longer awaiting approval', async () => {
    order.transitionTo('awaiting_execution');
    await orders.save(order);
    const saveQuotation = jest.spyOn(quotations, 'save');

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      InvalidServiceOrderTransitionError,
    );

    expect(saveQuotation).not.toHaveBeenCalled();
    expect(publisher.events).toEqual([]);
  });

  it('writes nothing when the reason is over the limit', async () => {
    const saveQuotation = jest.spyOn(quotations, 'save');

    await expect(
      useCase.execute(
        quotation.id,
        'x'.repeat(REJECTION_REASON_MAX_LENGTH + 1),
      ),
    ).rejects.toThrow(InvalidQuotationError);

    expect(saveQuotation).not.toHaveBeenCalled();
    expect(orders.orders.get(order.id)!.status).toBe('awaiting_approval');
  });

  it('throws when the quotation does not exist', async () => {
    await expect(
      useCase.execute('99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow(QuotationNotFoundError);
  });

  it('throws when the order behind the quotation is gone', async () => {
    orders.orders.delete(order.id);

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      ServiceOrderNotFoundError,
    );
  });
});
