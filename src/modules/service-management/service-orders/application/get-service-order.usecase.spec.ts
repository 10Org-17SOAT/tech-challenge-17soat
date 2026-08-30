import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { GetServiceOrderUseCase } from './get-service-order.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

describe('GetServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: GetServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new GetServiceOrderUseCase(repository);
  });

  it('returns the order when it exists', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await repository.save(order);

    await expect(useCase.execute(order.id)).resolves.toBe(order);
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });

  it('throws when the order was soft deleted', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await repository.save(order);
    order.delete();
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });
});
