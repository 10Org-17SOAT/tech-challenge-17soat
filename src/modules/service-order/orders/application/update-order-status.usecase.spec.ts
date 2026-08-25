import { InvalidOrderTransitionError } from '../domain/errors/invalid-order-transition.error';
import { OrderNotFoundError } from '../domain/errors/order-not-found.error';
import { Order } from '../domain/order.entity';
import { InMemoryOrderRepository } from '../__test__/in-memory-order.repository';
import { UpdateOrderStatusUseCase } from './update-order-status.usecase';

describe('UpdateOrderStatusUseCase', () => {
  let repository: InMemoryOrderRepository;
  let useCase: UpdateOrderStatusUseCase;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    useCase = new UpdateOrderStatusUseCase(repository);
  });

  it('advances the status one step', async () => {
    const order = Order.create({});
    await repository.save(order);

    const updated = await useCase.execute(order.id, 'in_diagnosis');
    expect(updated.status).toBe('in_diagnosis');
  });

  it('throws when the order does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID(), 'in_diagnosis'),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it('rejects invalid transitions', async () => {
    const order = Order.create({});
    await repository.save(order);

    await expect(useCase.execute(order.id, 'finished')).rejects.toBeInstanceOf(
      InvalidOrderTransitionError,
    );
  });
});
