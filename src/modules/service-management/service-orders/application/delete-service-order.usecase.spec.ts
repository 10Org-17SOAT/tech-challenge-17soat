import { ServiceOrderNotDeletableError } from '../domain/errors/service-order-not-deletable.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { DeleteServiceOrderUseCase } from './delete-service-order.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';

describe('DeleteServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: DeleteServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new DeleteServiceOrderUseCase(repository);
  });

  it('soft deletes an order in status received', async () => {
    const order = ServiceOrder.create({ vehicleId });
    await repository.save(order);

    await useCase.execute(order.id);

    await expect(repository.findById(order.id)).resolves.toBeNull();
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });

  it('rejects deleting orders past received', async () => {
    const order = ServiceOrder.create({ vehicleId });
    order.transitionTo('in_diagnosis');
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      ServiceOrderNotDeletableError,
    );
  });
});
