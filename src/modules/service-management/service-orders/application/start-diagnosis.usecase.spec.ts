import { AnamnesisRequiredException } from '../../anamnesis/domain/exceptions/anamnesis.exceptions';
import { InvalidServiceOrderTransitionError } from '../domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import type { AnamnesisExistencePort } from '../domain/ports/anamnesis-existence.port';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { StartDiagnosisUseCase } from './start-diagnosis.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';

describe('StartDiagnosisUseCase', () => {
  let orders: InMemoryServiceOrderRepository;
  let anamnesisExistence: AnamnesisExistencePort;
  let useCase: StartDiagnosisUseCase;

  beforeEach(() => {
    orders = new InMemoryServiceOrderRepository();
    anamnesisExistence = {
      existsByServiceOrderId: jest.fn().mockResolvedValue(true),
    };
    useCase = new StartDiagnosisUseCase(orders, anamnesisExistence);
  });

  it('moves a received order into diagnosis', async () => {
    const order = ServiceOrder.create({ vehicleId });
    await orders.save(order);

    const started = await useCase.execute(order.id);

    expect(started.status).toBe('in_diagnosis');
    expect(orders.orders.get(order.id)!.status).toBe('in_diagnosis');
  });

  it('refuses to start twice', async () => {
    const order = ServiceOrder.create({ vehicleId });
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

  it('throws AnamnesisRequiredException when no anamnesis exists', async () => {
    const order = ServiceOrder.create({ vehicleId });
    await orders.save(order);
    (anamnesisExistence.existsByServiceOrderId as jest.Mock).mockResolvedValue(
      false,
    );

    await expect(useCase.execute(order.id)).rejects.toThrow(
      AnamnesisRequiredException,
    );
    expect(orders.orders.get(order.id)!.status).toBe('received');
  });
});