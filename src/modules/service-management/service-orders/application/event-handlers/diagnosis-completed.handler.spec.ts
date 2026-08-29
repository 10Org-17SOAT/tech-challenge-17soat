import { randomUUID } from 'node:crypto';
import { ServiceOrder } from '../../domain/service-order.entity';
import { DiagnosisCompleted } from '../../domain/events/diagnosis-completed.event';
import { InMemoryServiceOrderRepository } from '../../__test__/in-memory-service-order.repository';
import { DiagnosisCompletedHandler } from './diagnosis-completed.handler';

describe('DiagnosisCompletedHandler', () => {
  let repository: InMemoryServiceOrderRepository;
  let handler: DiagnosisCompletedHandler;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    handler = new DiagnosisCompletedHandler(repository);
  });

  it('advances an in_diagnosis order to awaiting_approval', async () => {
    const order = ServiceOrder.create({});
    order.transitionTo('in_diagnosis');
    await repository.save(order);

    await handler.handle(new DiagnosisCompleted(order.id));

    const updated = await repository.findById(order.id);
    expect(updated?.status).toBe('awaiting_approval');
  });

  it('ignores the event when the order does not exist', async () => {
    await expect(
      handler.handle(new DiagnosisCompleted(randomUUID())),
    ).resolves.toBeUndefined();
  });

  it('ignores the event when the transition is invalid', async () => {
    const order = ServiceOrder.create({});
    await repository.save(order);

    await expect(
      handler.handle(new DiagnosisCompleted(order.id)),
    ).resolves.toBeUndefined();

    const unchanged = await repository.findById(order.id);
    expect(unchanged?.status).toBe('received');
  });
});
