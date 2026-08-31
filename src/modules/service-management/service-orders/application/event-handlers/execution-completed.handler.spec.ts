import { randomUUID } from 'node:crypto';
import { ServiceOrder } from '../../domain/service-order.entity';
import { ExecutionCompleted } from '../../domain/events/execution-completed.event';
import { InMemoryServiceOrderRepository } from '../../__test__/in-memory-service-order.repository';
import { ExecutionCompletedHandler } from './execution-completed.handler';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

describe('ExecutionCompletedHandler', () => {
  let repository: InMemoryServiceOrderRepository;
  let handler: ExecutionCompletedHandler;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    handler = new ExecutionCompletedHandler(repository);
  });

  it('advances an in_execution order to finished and stamps completedAt', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    order.transitionTo('awaiting_execution');
    order.transitionTo('in_execution');
    await repository.save(order);

    await handler.handle(new ExecutionCompleted(order.id));

    const updated = await repository.findById(order.id);
    expect(updated?.status).toBe('finished');
    expect(updated?.completedAt).not.toBeNull();
  });

  it('ignores the event when the order does not exist', async () => {
    await expect(
      handler.handle(new ExecutionCompleted(randomUUID())),
    ).resolves.toBeUndefined();
  });

  it('ignores the event when the transition is invalid', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await repository.save(order);

    await expect(
      handler.handle(new ExecutionCompleted(order.id)),
    ).resolves.toBeUndefined();

    const unchanged = await repository.findById(order.id);
    expect(unchanged?.status).toBe('received');
  });
});
