import { ServiceOrderNotDeletableError } from '../domain/errors/service-order-not-deletable.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import type { AnamnesisCascadePort } from '../domain/ports/anamnesis-cascade.port';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { DeleteServiceOrderUseCase } from './delete-service-order.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';

describe('DeleteServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let anamnesisCascade: AnamnesisCascadePort;
  let useCase: DeleteServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    anamnesisCascade = {
      softDeleteByServiceOrderId: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new DeleteServiceOrderUseCase(repository, anamnesisCascade);
  });

  it('soft deletes an order in status received', async () => {
    const order = ServiceOrder.create({ vehicleId });
    await repository.save(order);

    await useCase.execute(order.id);

    await expect(repository.findById(order.id)).resolves.toBeNull();
  });

  it('cascades the soft delete to the anamnesis', async () => {
    const order = ServiceOrder.create({ vehicleId });
    await repository.save(order);

    await useCase.execute(order.id);

    expect(anamnesisCascade.softDeleteByServiceOrderId).toHaveBeenCalledWith(
      order.id,
    );
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
    expect(anamnesisCascade.softDeleteByServiceOrderId).not.toHaveBeenCalled();
  });

  it('rejects deleting orders past received', async () => {
    const order = ServiceOrder.create({ vehicleId });
    order.transitionTo('in_diagnosis');
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      ServiceOrderNotDeletableError,
    );
    expect(anamnesisCascade.softDeleteByServiceOrderId).not.toHaveBeenCalled();
  });
});