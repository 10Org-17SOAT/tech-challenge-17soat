import { InvalidServiceOrderError } from '../domain/errors/invalid-service-order.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { UpdateServiceOrderUseCase } from './update-service-order.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

describe('UpdateServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: UpdateServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new UpdateServiceOrderUseCase(repository);
  });

  it('updates editable fields on an order in received', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await repository.save(order);

    const updated = await useCase.execute(order.id, {
      notes: 'agendar retorno',
      vehicleMileageAtEntry: 42000,
    });

    expect(updated.notes).toBe('agendar retorno');
    expect(updated.vehicleMileageAtEntry).toBe(42000);
  });

  it('throws when the order does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID(), { notes: 'x' }),
    ).rejects.toBeInstanceOf(ServiceOrderNotFoundError);
  });

  it('blocks mileage edit after in_execution', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    order.transitionTo('awaiting_execution');
    order.transitionTo('in_execution');
    await repository.save(order);

    await expect(
      useCase.execute(order.id, { vehicleMileageAtEntry: 99999 }),
    ).rejects.toBeInstanceOf(InvalidServiceOrderError);
  });
});
