import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { ApprovalTokenExpiredError } from '../domain/errors/approval-token-expired.error';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { QuotationAlreadyRejectedError } from '../domain/errors/quotation-already-rejected.error';
import { QuotationApproved } from '../domain/events/quotation-approved.event';
import { QuotationRejected } from '../domain/events/quotation-rejected.event';
import { Quotation } from '../domain/quotation.entity';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { RecordingDomainEventPublisher } from '../../__test__/recording-domain-event.publisher';
import { ApproveQuotationUseCase } from './approve-quotation.usecase';
import { DecideQuotationByTokenUseCase } from './decide-quotation-by-token.usecase';
import { GetQuotationByTokenUseCase } from './get-quotation-by-token.usecase';
import { RejectQuotationUseCase } from './reject-quotation.usecase';

const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

describe('DecideQuotationByTokenUseCase', () => {
  let quotations: InMemoryQuotationRepository;
  let orders: InMemoryServiceOrderRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: DecideQuotationByTokenUseCase;
  let order: ServiceOrder;
  let quotation: Quotation;
  let token: string;

  beforeEach(async () => {
    quotations = new InMemoryQuotationRepository();
    orders = new InMemoryServiceOrderRepository();
    publisher = new RecordingDomainEventPublisher();
    // The real collaborators, not mocks: the point is that approving or
    // rejecting by token follows exactly the rules of the use cases behind it.
    useCase = new DecideQuotationByTokenUseCase(
      new GetQuotationByTokenUseCase(quotations),
      new ApproveQuotationUseCase(quotations, orders, publisher),
      new RejectQuotationUseCase(quotations, orders, publisher),
    );

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
    token = quotation.issueApprovalToken();
    await quotations.save(quotation);
  });

  const orderStatus = () => orders.orders.get(order.id)!.status;

  it('approves, advancing the order', async () => {
    const decided = await useCase.execute({ token, decision: 'approved' });

    expect(decided.status).toBe('approved');
    expect(orderStatus()).toBe('awaiting_execution');
  });

  // Whoever answers — the panel, the email page or an outside caller — stock
  // must reserve the parts the same way.
  it('publishes QuotationApproved on approval, so stock reserves the parts', async () => {
    await useCase.execute({ token, decision: 'approved' });

    expect(publisher.events).toHaveLength(1);
    const [event] = publisher.events as [QuotationApproved];
    expect(event).toBeInstanceOf(QuotationApproved);
    expect(event.serviceOrderId).toBe(order.id);
  });

  it('rejects with a reason, sending the order back to diagnosis', async () => {
    const decided = await useCase.execute({
      token,
      decision: 'rejected',
      reason: 'Muito caro',
    });

    expect(decided.status).toBe('rejected');
    expect(decided.rejectionReason).toBe('Muito caro');
    expect(orderStatus()).toBe('in_diagnosis');
    // Rejected, not approved: nothing for stock to reserve.
    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(QuotationRejected);
  });

  describe('idempotency', () => {
    it('answers a repeated approval with the decision already made', async () => {
      const first = await useCase.execute({ token, decision: 'approved' });

      const second = await useCase.execute({ token, decision: 'approved' });

      expect(second.status).toBe('approved');
      expect(second.approvedAt).toEqual(first.approvedAt);
      expect(orderStatus()).toBe('awaiting_execution');
      // A replay must not reserve the parts a second time.
      expect(publisher.events).toHaveLength(1);
    });

    it('answers a repeated rejection without rejecting or publishing again', async () => {
      await useCase.execute({ token, decision: 'rejected', reason: 'Caro' });

      const second = await useCase.execute({
        token,
        decision: 'rejected',
        reason: 'Outro motivo',
      });

      expect(second.rejectionReason).toBe('Caro');
      expect(publisher.events).toHaveLength(1);
    });

    it('refuses to reject what was approved', async () => {
      await useCase.execute({ token, decision: 'approved' });

      await expect(
        useCase.execute({ token, decision: 'rejected' }),
      ).rejects.toThrow(QuotationAlreadyApprovedError);
    });

    it('refuses to approve what was rejected', async () => {
      await useCase.execute({ token, decision: 'rejected' });

      await expect(
        useCase.execute({ token, decision: 'approved' }),
      ).rejects.toThrow(QuotationAlreadyRejectedError);
    });
  });

  it('refuses an unknown token', async () => {
    await expect(
      useCase.execute({ token: 'nao-existe', decision: 'approved' }),
    ).rejects.toThrow(InvalidApprovalTokenError);
    expect(publisher.events).toEqual([]);
  });

  it('refuses an expired link, leaving both aggregates untouched', async () => {
    const expiredToken = quotation.issueApprovalToken(-1);
    await quotations.save(quotation);

    await expect(
      useCase.execute({ token: expiredToken, decision: 'rejected' }),
    ).rejects.toThrow(ApprovalTokenExpiredError);
    expect(quotation.status).toBe('issued');
    expect(orderStatus()).toBe('awaiting_approval');
  });

  it('refuses when the order has moved on, writing nothing', async () => {
    order.transitionTo('awaiting_execution');
    await orders.save(order);
    const saveQuotation = jest.spyOn(quotations, 'save');

    await expect(
      useCase.execute({ token, decision: 'rejected' }),
    ).rejects.toThrow(InvalidServiceOrderTransitionError);
    expect(saveQuotation).not.toHaveBeenCalled();
    expect(publisher.events).toEqual([]);
  });
});
