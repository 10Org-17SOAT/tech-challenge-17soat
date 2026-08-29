import { randomUUID } from 'node:crypto';
import { ServiceOrder } from '../../domain/service-order.entity';
import { QuotationApproved } from '../../domain/events/quotation-approved.event';
import { InMemoryServiceOrderRepository } from '../../__test__/in-memory-service-order.repository';
import { QuotationApprovedHandler } from './quotation-approved.handler';

describe('QuotationApprovedHandler', () => {
  let repository: InMemoryServiceOrderRepository;
  let handler: QuotationApprovedHandler;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    handler = new QuotationApprovedHandler(repository);
  });

  it('advances an awaiting_approval order to awaiting_execution and marks it approved', async () => {
    const order = ServiceOrder.create({});
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    await repository.save(order);

    await handler.handle(new QuotationApproved(order.id));

    const updated = await repository.findById(order.id);
    expect(updated?.status).toBe('awaiting_execution');
    expect(updated?.approvedByCustomer).toBe(true);
  });

  it('ignores the event when the order does not exist', async () => {
    await expect(
      handler.handle(new QuotationApproved(randomUUID())),
    ).resolves.toBeUndefined();
  });

  it('ignores the event when the transition is invalid', async () => {
    const order = ServiceOrder.create({});
    await repository.save(order);

    await expect(
      handler.handle(new QuotationApproved(order.id)),
    ).resolves.toBeUndefined();

    const unchanged = await repository.findById(order.id);
    expect(unchanged?.status).toBe('received');
  });
});
