import { RecordingDomainEventPublisher } from '../../../__test__/recording-domain-event.publisher';
import { InMemoryServiceOrderRepository } from '../../__test__/in-memory-service-order.repository';
import { ServiceOrderStatusChanged } from '../../domain/events/service-order-status-changed.event';
import { ServiceOrder } from '../../domain/service-order.entity';
import { EventPublishingServiceOrderRepository } from './event-publishing-service-order.repository';

const anOrder = () =>
  ServiceOrder.create({
    vehicleId: '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11',
    openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
    openedByName: 'Consultant Fixture',
  });

describe('EventPublishingServiceOrderRepository', () => {
  let delegate: InMemoryServiceOrderRepository;
  let publisher: RecordingDomainEventPublisher;
  let repository: EventPublishingServiceOrderRepository;

  beforeEach(() => {
    delegate = new InMemoryServiceOrderRepository();
    publisher = new RecordingDomainEventPublisher();
    repository = new EventPublishingServiceOrderRepository(delegate, publisher);
  });

  it('publishes what the order raised once the delegate has saved it', async () => {
    const order = anOrder();
    order.transitionTo('in_diagnosis');

    await repository.save(order);

    expect(delegate.orders.get(order.id)).toBe(order);
    expect(
      publisher.events.map((event) => (event as ServiceOrderStatusChanged).to),
    ).toEqual(['received', 'in_diagnosis']);
  });

  it('does not publish the same event twice when saved again', async () => {
    const order = anOrder();
    await repository.save(order);
    await repository.save(order);

    expect(publisher.events).toHaveLength(1);
  });

  it('publishes nothing when the save fails', async () => {
    const order = anOrder();
    jest
      .spyOn(delegate, 'save')
      .mockRejectedValueOnce(new Error('connection lost'));

    await expect(repository.save(order)).rejects.toThrow('connection lost');
    expect(publisher.events).toEqual([]);
  });

  it('delegates reads untouched', async () => {
    const order = anOrder();
    await repository.save(order);

    await expect(repository.findById(order.id)).resolves.toBe(order);
    await expect(
      repository.findMany({ page: 1, limit: 10 }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(repository.findItems(order.id)).resolves.toEqual([]);
    await repository.replaceItems(order.id, []);
    await expect(repository.averageExecutionTime({})).resolves.toMatchObject({
      sampleSize: 0,
    });
  });
});
