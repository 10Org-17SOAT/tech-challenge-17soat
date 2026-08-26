import { OrderNotDeletableError } from '../domain/errors/order-not-deletable.error';
import { OrderNotFoundError } from '../domain/errors/order-not-found.error';
import { Order } from '../domain/order.entity';
import { InMemoryOrderRepository } from '../__test__/in-memory-order.repository';
import { DeleteOrderUseCase } from './delete-order.usecase';

describe('DeleteOrderUseCase', () => {
  let repository: InMemoryOrderRepository;
  let useCase: DeleteOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    useCase = new DeleteOrderUseCase(repository);
  });

  it('soft deletes an order in status received', async () => {
    const order = Order.create({});
    await repository.save(order);

    await useCase.execute(order.id);

    await expect(repository.findById(order.id)).resolves.toBeNull();
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });

  it('rejects deleting orders past received', async () => {
    const order = Order.create({});
    order.transitionTo('in_diagnosis');
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      OrderNotDeletableError,
    );
  });
});
