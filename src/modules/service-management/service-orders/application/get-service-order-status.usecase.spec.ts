import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { GetServiceOrderStatusUseCase } from './get-service-order-status.usecase';

describe('GetServiceOrderStatusUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: GetServiceOrderStatusUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new GetServiceOrderStatusUseCase(repository);
  });

  it('returns the status of an existing order', async () => {
    const order = ServiceOrder.create({});
    await repository.save(order);

    await expect(useCase.execute(order.id)).resolves.toBe('received');
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });

  it('throws when the order was soft deleted', async () => {
    const order = ServiceOrder.create({});
    await repository.save(order);
    order.delete();
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });
});
