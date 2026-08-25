import { InMemoryOrderRepository } from '../__test__/in-memory-order.repository';
import { CreateOrderUseCase } from './create-order.usecase';

describe('CreateOrderUseCase', () => {
  let repository: InMemoryOrderRepository;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    useCase = new CreateOrderUseCase(repository);
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
