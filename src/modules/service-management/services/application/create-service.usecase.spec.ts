import { ServiceNameAlreadyExistsError } from '../domain/errors/service-name-already-exists.error';
import { InMemoryServiceRepository } from '../__test__/in-memory-service.repository';
import { CreateServiceUseCase } from './create-service.usecase';

describe('CreateServiceUseCase', () => {
  let repository: InMemoryServiceRepository;
  let useCase: CreateServiceUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceRepository();
    useCase = new CreateServiceUseCase(repository);
  });

  it('creates a service and persists it', async () => {
    const service = await useCase.execute({
      name: 'Troca de óleo',
      category: 'mechanical',
      priceInCents: 9990,
    });

    await expect(repository.findById(service.id)).resolves.toBe(service);
  });

  it('rejects a name already used by an active service', async () => {
    await useCase.execute({
      name: 'Troca de óleo',
      category: 'mechanical',
      priceInCents: 9990,
    });

    await expect(
      useCase.execute({
        name: 'Troca de óleo',
        category: 'electrical',
        priceInCents: 5000,
      }),
    ).rejects.toBeInstanceOf(ServiceNameAlreadyExistsError);
  });
});
