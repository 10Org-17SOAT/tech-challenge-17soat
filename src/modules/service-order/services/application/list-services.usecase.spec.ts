import { Service } from '@/modules/service-order/services/domain/service.entity';
import { InMemoryServiceRepository } from '@/modules/service-order/services/__test__/in-memory-service.repository';
import { ListServicesUseCase } from '@/modules/service-order/services/application/list-services.usecase';

describe('ListServicesUseCase', () => {
  let repository: InMemoryServiceRepository;
  let useCase: ListServicesUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceRepository();
    useCase = new ListServicesUseCase(repository);
  });

  it('returns a page of services with pagination metadata', async () => {
    for (let i = 1; i <= 25; i++) {
      await repository.save(
        Service.create({
          name: `Service ${i}`,
          category: 'mechanical',
          priceInCents: 100 * i,
        }),
      );
    }

    const result = await useCase.execute({ page: 2, limit: 20 });

    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
  });
});
