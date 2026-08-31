import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { GetServiceOrderStatusUseCase } from './get-service-order-status.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

describe('GetServiceOrderStatusUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: GetServiceOrderStatusUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new GetServiceOrderStatusUseCase(repository);
  });

  it('returns the status of an existing order', async () => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    await repository.save(order);

    await expect(useCase.execute(order.id)).resolves.toBe('received');
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });

  it('throws when the order was soft deleted', async () => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    await repository.save(order);
    order.delete();
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });
});
