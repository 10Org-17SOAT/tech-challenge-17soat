import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { GetAverageExecutionTimeUseCase } from './get-average-execution-time.usecase';

const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

// `transitionTo` stamps startedAt/completedAt with `new Date()`, so an order
// with a known duration has to be rebuilt through `restore`.
function finishedOrder(startedAt: Date, completedAt: Date): ServiceOrder {
  return ServiceOrder.restore({
    id: crypto.randomUUID(),
    vehicleId: VEHICLE_ID,
    openedById: OPENED_BY_ID,
    openedByName: OPENED_BY_NAME,
    status: 'finished',
    approvedByCustomer: true,
    notes: null,
    vehicleMileageAtEntry: null,
    scheduledAt: null,
    startedAt,
    completedAt,
    deliveredAt: null,
    createdAt: startedAt,
    updatedAt: completedAt,
    deletedAt: null,
  });
}

const at = (iso: string) => new Date(iso);

describe('GetAverageExecutionTimeUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: GetAverageExecutionTimeUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new GetAverageExecutionTimeUseCase(repository);
  });

  it('averages the stretch between startedAt and completedAt', async () => {
    await repository.save(
      finishedOrder(at('2026-08-10T09:00:00Z'), at('2026-08-10T13:00:00Z')),
    );
    await repository.save(
      finishedOrder(at('2026-08-11T09:00:00Z'), at('2026-08-11T11:00:00Z')),
    );

    const result = await useCase.execute({});

    expect(result).toEqual({
      averageExecutionTimeMinutes: 180,
      sampleSize: 2,
    });
  });

  it('reports null with a zero sample when nothing finished in the window', async () => {
    await repository.save(
      ServiceOrder.create({
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      }),
    );

    const result = await useCase.execute({});

    expect(result).toEqual({
      averageExecutionTimeMinutes: null,
      sampleSize: 0,
    });
  });

  it('rounds to whole minutes', async () => {
    // 100 seconds and 200 seconds average 150s = 2.5 minutes.
    await repository.save(
      finishedOrder(at('2026-08-10T09:00:00Z'), at('2026-08-10T09:01:40Z')),
    );
    await repository.save(
      finishedOrder(at('2026-08-11T09:00:00Z'), at('2026-08-11T09:03:20Z')),
    );

    const result = await useCase.execute({});

    expect(result.averageExecutionTimeMinutes).toBe(3);
  });

  it('recorta a janela por completedAt, com as duas pontas inclusivas', async () => {
    // Started before the window but finished inside it: counts.
    await repository.save(
      finishedOrder(at('2026-07-31T20:00:00Z'), at('2026-08-01T00:00:00Z')),
    );
    // Finished exactly on the upper bound: counts.
    await repository.save(
      finishedOrder(at('2026-08-31T21:00:00Z'), at('2026-08-31T23:00:00Z')),
    );
    // Finished after the window: out.
    await repository.save(
      finishedOrder(at('2026-09-01T09:00:00Z'), at('2026-09-01T19:00:00Z')),
    );

    const result = await useCase.execute({
      from: at('2026-08-01T00:00:00Z'),
      to: at('2026-08-31T23:00:00Z'),
    });

    expect(result).toEqual({
      averageExecutionTimeMinutes: 180,
      sampleSize: 2,
    });
  });

  it('ignores soft-deleted and unfinished orders', async () => {
    await repository.save(
      ServiceOrder.restore({
        id: crypto.randomUUID(),
        vehicleId: VEHICLE_ID,
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
        status: 'finished',
        approvedByCustomer: true,
        notes: null,
        vehicleMileageAtEntry: null,
        scheduledAt: null,
        startedAt: at('2026-08-10T09:00:00Z'),
        completedAt: at('2026-08-10T19:00:00Z'),
        deliveredAt: null,
        createdAt: at('2026-08-10T09:00:00Z'),
        updatedAt: at('2026-08-10T19:00:00Z'),
        deletedAt: at('2026-08-12T00:00:00Z'),
      }),
    );

    const running = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    running.transitionTo('in_diagnosis');
    await repository.save(running);

    await repository.save(
      finishedOrder(at('2026-08-11T09:00:00Z'), at('2026-08-11T11:00:00Z')),
    );

    const result = await useCase.execute({});

    expect(result).toEqual({
      averageExecutionTimeMinutes: 120,
      sampleSize: 1,
    });
  });
});
