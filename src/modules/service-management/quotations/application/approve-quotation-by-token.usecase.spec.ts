import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { ApprovalTokenExpiredError } from '../domain/errors/approval-token-expired.error';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { Quotation } from '../domain/quotation.entity';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { ApproveQuotationByTokenUseCase } from './approve-quotation-by-token.usecase';

const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

describe('ApproveQuotationByTokenUseCase', () => {
  let quotations: InMemoryQuotationRepository;
  let orders: InMemoryServiceOrderRepository;
  let useCase: ApproveQuotationByTokenUseCase;
  let order: ServiceOrder;
  let quotation: Quotation;
  let rawToken: string;

  beforeEach(async () => {
    quotations = new InMemoryQuotationRepository();
    orders = new InMemoryServiceOrderRepository();
    useCase = new ApproveQuotationByTokenUseCase(quotations, orders);

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
    rawToken = quotation.issueApprovalToken();
    await quotations.save(quotation);
  });

  it('approves the quotation and advances the order', async () => {
    const approved = await useCase.execute(rawToken);

    expect(approved.status).toBe('approved');
    expect(orders.orders.get(order.id)!.status).toBe('awaiting_execution');
    expect(orders.orders.get(order.id)!.approvedByCustomer).toBe(true);
  });

  // The raw token never reaches a query; the lookup is by digest.
  it('finds the quotation by the hash of the token, not the token', async () => {
    const byHash = await quotations.findByApprovalTokenHash(
      Quotation.hashApprovalToken(rawToken),
    );

    expect(byHash!.id).toBe(quotation.id);
    await expect(
      quotations.findByApprovalTokenHash(rawToken),
    ).resolves.toBeNull();
  });

  it('rejects an unknown token without saying whether one exists', async () => {
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      InvalidApprovalTokenError,
    );
  });

  it('rejects an expired link and leaves both aggregates untouched', async () => {
    const expiredToken = quotation.issueApprovalToken(-1);
    await quotations.save(quotation);

    await expect(useCase.execute(expiredToken)).rejects.toThrow(
      ApprovalTokenExpiredError,
    );
    expect(quotation.status).toBe('issued');
    expect(orders.orders.get(order.id)!.status).toBe('awaiting_approval');
  });

  it('rejects a second click on the same link', async () => {
    await useCase.execute(rawToken);

    await expect(useCase.execute(rawToken)).rejects.toThrow(
      QuotationAlreadyApprovedError,
    );
  });

  // Both aggregates are mutated in memory before anything is written, so an
  // order that already moved on cannot leave a half-applied approval behind.
  it('does not write when the order is no longer awaiting approval', async () => {
    order.transitionTo('awaiting_execution');
    await orders.save(order);
    const saveQuotation = jest.spyOn(quotations, 'save');

    await expect(useCase.execute(rawToken)).rejects.toThrow(
      InvalidServiceOrderTransitionError,
    );

    expect(saveQuotation).not.toHaveBeenCalled();
  });

  it('throws when the order behind the quotation is gone', async () => {
    orders.orders.delete(order.id);

    await expect(useCase.execute(rawToken)).rejects.toThrow(
      ServiceOrderNotFoundError,
    );
  });
});
