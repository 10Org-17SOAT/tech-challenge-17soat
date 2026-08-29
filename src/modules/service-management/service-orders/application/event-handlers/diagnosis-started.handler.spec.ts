import { randomUUID } from 'node:crypto';
import { ServiceOrder } from '../../domain/service-order.entity';
import { DiagnosisStarted } from '../../domain/events/diagnosis-started.event';
import { InMemoryServiceOrderRepository } from '../../__test__/in-memory-service-order.repository';
import { DiagnosisStartedHandler } from './diagnosis-started.handler';

describe('DiagnosisStartedHandler', () => {
  let repository: InMemoryServiceOrderRepository;
  let handler: DiagnosisStartedHandler;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    handler = new DiagnosisStartedHandler(repository);
  });

  it('advances a received order to in_diagnosis', async () => {
    const order = ServiceOrder.create({});
    await repository.save(order);

    await handler.handle(new DiagnosisStarted(order.id));

    const updated = await repository.findById(order.id);
    expect(updated?.status).toBe('in_diagnosis');
  });

  it('ignores the event when the order does not exist', async () => {
    await expect(
      handler.handle(new DiagnosisStarted(randomUUID())),
    ).resolves.toBeUndefined();
  });

  it('ignores the event when the transition is invalid', async () => {
    const order = ServiceOrder.create({});
    order.transitionTo('in_diagnosis');
    await repository.save(order);

    await expect(
      handler.handle(new DiagnosisStarted(order.id)),
    ).resolves.toBeUndefined();

    const unchanged = await repository.findById(order.id);
    expect(unchanged?.status).toBe('in_diagnosis');
  });
});
