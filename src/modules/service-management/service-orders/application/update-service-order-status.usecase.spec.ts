import { InvalidServiceOrderTransitionError } from '../domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { UpdateServiceOrderStatusUseCase } from './update-service-order-status.usecase';

describe('UpdateServiceOrderStatusUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: UpdateServiceOrderStatusUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new UpdateServiceOrderStatusUseCase(repository);
  });

  it('advances the status one step', async () => {
    const order = ServiceOrder.create({});
    await repository.save(order);

    const updated = await useCase.execute(order.id, 'in_diagnosis');
    expect(updated.status).toBe('in_diagnosis');
  });

  it('throws when the order does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID(), 'in_diagnosis'),
    ).rejects.toBeInstanceOf(ServiceOrderNotFoundError);
  });

  it('rejects invalid transitions', async () => {
    const order = ServiceOrder.create({});
    await repository.save(order);

    await expect(useCase.execute(order.id, 'finished')).rejects.toBeInstanceOf(
      InvalidServiceOrderTransitionError,
    );
  });
});
