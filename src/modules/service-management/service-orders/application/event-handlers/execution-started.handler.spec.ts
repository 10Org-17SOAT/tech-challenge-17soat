import { randomUUID } from 'node:crypto';
import { ServiceOrder } from '../../domain/service-order.entity';
import { ExecutionStarted } from '../../domain/events/execution-started.event';
import { InMemoryServiceOrderRepository } from '../../__test__/in-memory-service-order.repository';
import { ExecutionStartedHandler } from './execution-started.handler';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

describe('ExecutionStartedHandler', () => {
  let repository: InMemoryServiceOrderRepository;
  let handler: ExecutionStartedHandler;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    handler = new ExecutionStartedHandler(repository);
  });

  it('advances an awaiting_execution order to in_execution and stamps startedAt', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    order.transitionTo('awaiting_execution');
    await repository.save(order);

    await handler.handle(new ExecutionStarted(order.id));

    const updated = await repository.findById(order.id);
    expect(updated?.status).toBe('in_execution');
    expect(updated?.startedAt).not.toBeNull();
  });

  it('ignores the event when the order does not exist', async () => {
    await expect(
      handler.handle(new ExecutionStarted(randomUUID())),
    ).resolves.toBeUndefined();
  });

  it('ignores the event when the transition is invalid', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await repository.save(order);

    await expect(
      handler.handle(new ExecutionStarted(order.id)),
    ).resolves.toBeUndefined();

    const unchanged = await repository.findById(order.id);
    expect(unchanged?.status).toBe('received');
  });
});
