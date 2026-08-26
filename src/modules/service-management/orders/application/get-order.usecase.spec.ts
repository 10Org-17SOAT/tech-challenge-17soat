import { OrderNotFoundError } from '../domain/errors/order-not-found.error';
import { Order } from '../domain/order.entity';
import { InMemoryOrderRepository } from '../__test__/in-memory-order.repository';
import { GetOrderUseCase } from './get-order.usecase';

describe('GetOrderUseCase', () => {
  let repository: InMemoryOrderRepository;
  let useCase: GetOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    useCase = new GetOrderUseCase(repository);
  });

  it('returns the order when it exists', async () => {
    const order = Order.create({});
    await repository.save(order);

    await expect(useCase.execute(order.id)).resolves.toBe(order);
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });

  it('throws when the order was soft deleted', async () => {
    const order = Order.create({});
    await repository.save(order);
    order.delete();
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });
});
