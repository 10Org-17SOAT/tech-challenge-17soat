import { ServiceNotFoundError } from '../domain/errors/service-not-found.error';
import { Service } from '../domain/service.entity';
import { InMemoryServiceRepository } from '../__test__/in-memory-service.repository';
import { GetServiceUseCase } from './get-service.usecase';

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
      laborPriceInCents: 5000,
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
