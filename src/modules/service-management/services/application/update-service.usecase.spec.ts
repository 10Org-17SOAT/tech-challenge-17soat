import { ServiceNameAlreadyExistsError } from '../domain/errors/service-name-already-exists.error';
import { ServiceNotFoundError } from '../domain/errors/service-not-found.error';
import { Service } from '../domain/service.entity';
import { InMemoryServiceRepository } from '../__test__/in-memory-service.repository';
import { UpdateServiceUseCase } from './update-service.usecase';

describe('UpdateServiceUseCase', () => {
  let repository: InMemoryServiceRepository;
  let useCase: UpdateServiceUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceRepository();
    useCase = new UpdateServiceUseCase(repository);
  });

  it('updates only the provided fields', async () => {
    const service = Service.create({
      name: 'Alinhamento',
      category: 'tire',
      laborPriceInCents: 5000,
    });
    await repository.save(service);

    const updated = await useCase.execute(service.id, {
      laborPriceInCents: 7000,
    });

    expect(updated.name).toBe('Alinhamento');
    expect(updated.laborPriceInCents).toBe(7000);
  });

  it('can deactivate a service via active flag', async () => {
    const service = Service.create({
      name: 'Revisão',
      category: 'mechanical',
      laborPriceInCents: 20000,
    });
    await repository.save(service);

    const updated = await useCase.execute(service.id, { active: false });

    expect(updated.active).toBe(false);
  });

  it('throws when the service does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID(), { name: 'X' }),
    ).rejects.toBeInstanceOf(ServiceNotFoundError);
  });

  it('rejects renaming to a name used by another active service', async () => {
    const a = Service.create({
      name: 'Troca de óleo',
      category: 'mechanical',
      laborPriceInCents: 9990,
    });
    const b = Service.create({
      name: 'Balanceamento',
      category: 'tire',
      laborPriceInCents: 4000,
    });
    await repository.save(a);
    await repository.save(b);

    await expect(
      useCase.execute(b.id, { name: 'Troca de óleo' }),
    ).rejects.toBeInstanceOf(ServiceNameAlreadyExistsError);
  });

  it('allows keeping its own name', async () => {
    const service = Service.create({
      name: 'Alinhamento',
      category: 'tire',
      laborPriceInCents: 5000,
    });
    await repository.save(service);

    await expect(
      useCase.execute(service.id, {
        name: 'Alinhamento',
        laborPriceInCents: 6000,
      }),
    ).resolves.toMatchObject({ laborPriceInCents: 6000 });
  });
});
