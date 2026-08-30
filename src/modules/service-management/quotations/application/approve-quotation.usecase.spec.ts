import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { Quotation } from '../domain/quotation.entity';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { ApproveQuotationUseCase } from './approve-quotation.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

describe('ApproveQuotationUseCase', () => {
  let quotations: InMemoryQuotationRepository;
  let orders: InMemoryServiceOrderRepository;
  let useCase: ApproveQuotationUseCase;

  beforeEach(() => {
    quotations = new InMemoryQuotationRepository();
    orders = new InMemoryServiceOrderRepository();
    useCase = new ApproveQuotationUseCase(quotations, orders);
  });

  const givenAwaitingApproval = async (): Promise<{
    order: ServiceOrder;
    quotation: Quotation;
  }> => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    await orders.save(order);

    const quotation = Quotation.issue({
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

    return { order, quotation };
  };

  it('approves the quotation and advances the order', async () => {
    const { order, quotation } = await givenAwaitingApproval();

    const approved = await useCase.execute(quotation.id);

    expect(approved.status).toBe('approved');
    expect(orders.orders.get(order.id)!.status).toBe('awaiting_execution');
    expect(orders.orders.get(order.id)!.approvedByCustomer).toBe(true);
  });

  it('refuses a second approval', async () => {
    const { quotation } = await givenAwaitingApproval();
    await useCase.execute(quotation.id);

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      QuotationAlreadyApprovedError,
    );
  });

  // Both aggregates are mutated in memory before either is written, so an
  // order that cannot advance leaves the quotation untouched. Without a
  // transaction this ordering is the only thing keeping the two in step.
  it('leaves the quotation unapproved when the order cannot advance', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await orders.save(order);
    const quotation = Quotation.issue({
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

    // Asserting on the write, not on the stored object: the in-memory
    // repository is an identity map, so an unsaved in-memory mutation would
    // still be visible through it. What matters is that nothing was persisted.
    const saveQuotation = jest.spyOn(quotations, 'save');
    const saveOrder = jest.spyOn(orders, 'save');

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      InvalidServiceOrderTransitionError,
    );

    expect(saveQuotation).not.toHaveBeenCalled();
    expect(saveOrder).not.toHaveBeenCalled();
    expect(orders.orders.get(order.id)!.status).toBe('received');
  });

  it('throws for an unknown quotation', async () => {
    await expect(
      useCase.execute('99999999-9999-9999-9999-999999999999'),
    ).rejects.toThrow(QuotationNotFoundError);
  });

  it('throws when the quotation points at a missing order', async () => {
    const quotation = Quotation.issue({
      serviceOrderId: '88888888-8888-8888-8888-888888888888',
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

    await expect(useCase.execute(quotation.id)).rejects.toThrow(
      ServiceOrderNotFoundError,
    );
  });
});
