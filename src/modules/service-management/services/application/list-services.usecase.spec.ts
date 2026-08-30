import { Service } from '../domain/service.entity';
import { InMemoryServiceRepository } from '../__test__/in-memory-service.repository';
import { ListServicesUseCase } from './list-services.usecase';

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
          laborPriceInCents: 100 * i,
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
