import { ServiceOrderNotDeletableError } from '../domain/errors/service-order-not-deletable.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import type { AnamnesisCascadePort } from '../domain/ports/anamnesis-cascade.port';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { DeleteServiceOrderUseCase } from './delete-service-order.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

describe('DeleteServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let anamnesisCascade: AnamnesisCascadePort;
  let useCase: DeleteServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    anamnesisCascade = { softDeleteByServiceOrderId: jest.fn().mockResolvedValue(undefined) };
    useCase = new DeleteServiceOrderUseCase(repository, anamnesisCascade);
  });

  it('soft deletes an order in status received', async () => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
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
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    order.transitionTo('in_diagnosis');
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      ServiceOrderNotDeletableError,
    );
  });
});
