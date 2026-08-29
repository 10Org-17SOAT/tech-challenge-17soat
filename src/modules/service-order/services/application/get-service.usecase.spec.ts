import { ServiceNotFoundError } from '@/modules/service-order/services/domain/errors/service-not-found.error';
import { Service } from '@/modules/service-order/services/domain/service.entity';
import { InMemoryServiceRepository } from '@/modules/service-order/services/__test__/in-memory-service.repository';
import { GetServiceUseCase } from '@/modules/service-order/services/application/get-service.usecase';

describe('GetServiceUseCase', () => {
  let repository: InMemoryServiceRepository;
  let useCase: GetServiceUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceRepository();
    useCase = new GetServiceUseCase(repository);
  });

  it('returns the service by id', async () => {
    const service = Service.create({
      name: 'Alinhamento',
      category: 'tire',
      priceInCents: 5000,
    });
    await repository.save(service);

    await expect(useCase.execute(service.id)).resolves.toBe(service);
  });

  it('throws when the service does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      ServiceNotFoundError,
    );
  });
});
