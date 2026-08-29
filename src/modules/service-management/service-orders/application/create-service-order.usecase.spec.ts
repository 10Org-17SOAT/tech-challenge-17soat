import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { CreateServiceOrderUseCase } from './create-service-order.usecase';

describe('CreateServiceOrderUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: CreateServiceOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new CreateServiceOrderUseCase(repository);
  });

  it('creates an order in status received and persists it', async () => {
    const order = await useCase.execute({
      notes: 'batida no farol',
      vehicleMileageAtEntry: 45000,
    });

    expect(order.status).toBe('received');
    expect(order.approvedByCustomer).toBe(false);
    await expect(repository.findById(order.id)).resolves.toBe(order);
  });

  it('accepts a payload with no optional fields', async () => {
    const order = await useCase.execute({});
    expect(order.notes).toBeNull();
    expect(order.vehicleMileageAtEntry).toBeNull();
    expect(order.scheduledAt).toBeNull();
  });
});
