import { randomUUID } from 'node:crypto';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { Quotation } from '../domain/quotation.entity';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { ServiceOrderBillingQueryImpl } from './service-order-billing.query.impl';

const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

async function givenOrderAt(
  orderRepository: InMemoryServiceOrderRepository,
  status: 'finished' | 'in_execution' | 'awaiting_approval',
): Promise<ServiceOrder> {
  const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
  order.transitionTo('in_diagnosis');
  order.transitionTo('awaiting_approval');
  if (status === 'awaiting_approval') {
    await orderRepository.save(order);
    return order;
  }
  order.transitionTo('awaiting_execution');
  order.transitionTo('in_execution');
  if (status === 'in_execution') {
    await orderRepository.save(order);
    return order;
  }
  order.transitionTo('finished');
  await orderRepository.save(order);
  return order;
}

describe('ServiceOrderBillingQueryImpl', () => {
  let orderRepository: InMemoryServiceOrderRepository;
  let quotationRepository: InMemoryQuotationRepository;
  let query: ServiceOrderBillingQueryImpl;

  beforeEach(() => {
    orderRepository = new InMemoryServiceOrderRepository();
    quotationRepository = new InMemoryQuotationRepository();
    query = new ServiceOrderBillingQueryImpl(
      orderRepository,
      quotationRepository,
    );
  });

  it('returns null when the order does not exist', async () => {
    await expect(query.findByServiceOrderId(randomUUID())).resolves.toBeNull();
  });

  it('returns null when the order has no quotation', async () => {
    const order = await givenOrderAt(orderRepository, 'finished');

    await expect(query.findByServiceOrderId(order.id)).resolves.toBeNull();
  });

  it('is not payable while the order is still in execution', async () => {
    const order = await givenOrderAt(orderRepository, 'in_execution');
    const quotation = Quotation.issue({
      serviceOrderId: order.id,
      items: [
        {
          kind: 'labor',
          referenceId: randomUUID(),
          nameSnapshot: 'Troca de óleo',
          unitPriceInCents: 45000,
          quantity: 1,
        },
      ],
    });
    quotation.approve();
    await quotationRepository.save(quotation);

    await expect(query.findByServiceOrderId(order.id)).resolves.toEqual({
      serviceOrderId: order.id,
      payable: false,
      totalInCents: 45000,
    });
  });

  it('is payable once the order is finished and the quotation is approved', async () => {
    const order = await givenOrderAt(orderRepository, 'finished');
    const quotation = Quotation.issue({
      serviceOrderId: order.id,
      items: [
        {
          kind: 'labor',
          referenceId: randomUUID(),
          nameSnapshot: 'Troca de óleo',
          unitPriceInCents: 45000,
          quantity: 1,
        },
      ],
    });
    quotation.approve();
    await quotationRepository.save(quotation);

    await expect(query.findByServiceOrderId(order.id)).resolves.toEqual({
      serviceOrderId: order.id,
      payable: true,
      totalInCents: 45000,
    });
  });

  it('is not payable when finished but the quotation was never approved', async () => {
    const order = await givenOrderAt(orderRepository, 'finished');
    const quotation = Quotation.issue({
      serviceOrderId: order.id,
      items: [
        {
          kind: 'labor',
          referenceId: randomUUID(),
          nameSnapshot: 'Troca de óleo',
          unitPriceInCents: 45000,
          quantity: 1,
        },
      ],
    });
    await quotationRepository.save(quotation);

    await expect(query.findByServiceOrderId(order.id)).resolves.toEqual({
      serviceOrderId: order.id,
      payable: false,
      totalInCents: 45000,
    });
  });
});
