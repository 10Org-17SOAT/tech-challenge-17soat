import { randomUUID } from 'node:crypto';
import { PaymentReceived } from '../../../../payment/domain/events/payment-received.event';
import { ServiceOrder } from '../../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../../__test__/in-memory-service-order.repository';
import { PaymentReceivedHandler } from './payment-received.handler';

const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

describe('PaymentReceivedHandler', () => {
  let repository: InMemoryServiceOrderRepository;
  let handler: PaymentReceivedHandler;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    handler = new PaymentReceivedHandler(repository);
  });

  it('advances a finished order to delivered and stamps deliveredAt', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    order.transitionTo('awaiting_execution');
    order.transitionTo('in_execution');
    order.transitionTo('finished');
    await repository.save(order);

    await handler.handle(new PaymentReceived(order.id));

    const updated = await repository.findById(order.id);
    expect(updated?.status).toBe('delivered');
    expect(updated?.deliveredAt).not.toBeNull();
  });

  it('ignores the event when the order does not exist', async () => {
    await expect(
      handler.handle(new PaymentReceived(randomUUID())),
    ).resolves.toBeUndefined();
  });

  it('ignores the event when the order is not finished yet', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await repository.save(order);

    await expect(
      handler.handle(new PaymentReceived(order.id)),
    ).resolves.toBeUndefined();

    const unchanged = await repository.findById(order.id);
    expect(unchanged?.status).toBe('received');
  });
});
