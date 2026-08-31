import { InvalidServiceOrderTransitionError } from '../domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { StartDiagnosisUseCase } from './start-diagnosis.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';

describe('StartDiagnosisUseCase', () => {
  let orders: InMemoryServiceOrderRepository;
  let useCase: StartDiagnosisUseCase;

  beforeEach(() => {
    orders = new InMemoryServiceOrderRepository();
    useCase = new StartDiagnosisUseCase(orders);
  });

  it('moves a received order into diagnosis', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await orders.save(order);

    const started = await useCase.execute(order.id);

    expect(started.status).toBe('in_diagnosis');
    expect(orders.orders.get(order.id)!.status).toBe('in_diagnosis');
  });

  it('refuses to start twice', async () => {
    const order = ServiceOrder.create({ vehicleId: VEHICLE_ID });
    await orders.save(order);
    await useCase.execute(order.id);

    await expect(useCase.execute(order.id)).rejects.toThrow(
      InvalidServiceOrderTransitionError,
    );
  });

  it('throws for an unknown order', async () => {
    await expect(
      useCase.execute('99999999-9999-9999-9999-999999999999'),
    ).rejects.toThrow(ServiceOrderNotFoundError);
  });
});
