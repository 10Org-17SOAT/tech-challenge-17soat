import { ServiceNotFoundError } from '@/modules/service-order/services/domain/errors/service-not-found.error';
import { Service } from '@/modules/service-order/services/domain/service.entity';
import { InMemoryServiceRepository } from '@/modules/service-order/services/__test__/in-memory-service.repository';
import { DeleteServiceUseCase } from '@/modules/service-order/services/application/delete-service.usecase';

describe('DeleteServiceUseCase', () => {
  let repository: InMemoryServiceRepository;
  let useCase: DeleteServiceUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceRepository();
    useCase = new DeleteServiceUseCase(repository);
  });

  it('soft deletes the service, hiding it from lookups', async () => {
    const service = Service.create({
      name: 'Balanceamento',
      category: 'tire',
      priceInCents: 3000,
    });
    await repository.save(service);

    await useCase.execute(service.id);

    await expect(repository.findById(service.id)).resolves.toBeNull();
    expect(repository.services.get(service.id)?.deletedAt).toBeInstanceOf(Date);
  });

  it('throws for an unknown or already deleted service', async () => {
    const service = Service.create({
      name: 'Balanceamento',
      category: 'tire',
      priceInCents: 3000,
    });
    await repository.save(service);
    await useCase.execute(service.id);

    await expect(useCase.execute(service.id)).rejects.toBeInstanceOf(
      ServiceNotFoundError,
    );
  });
});
