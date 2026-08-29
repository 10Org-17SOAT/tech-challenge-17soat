import { ServiceNameAlreadyExistsError } from '@/modules/service-order/services/domain/errors/service-name-already-exists.error';
import { ServiceNotFoundError } from '@/modules/service-order/services/domain/errors/service-not-found.error';
import { Service } from '@/modules/service-order/services/domain/service.entity';
import { InMemoryServiceRepository } from '@/modules/service-order/services/__test__/in-memory-service.repository';
import { UpdateServiceUseCase } from '@/modules/service-order/services/application/update-service.usecase';

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
      priceInCents: 5000,
    });
    await repository.save(service);

    const updated = await useCase.execute(service.id, { priceInCents: 7000 });

    expect(updated.name).toBe('Alinhamento');
    expect(updated.priceInCents).toBe(7000);
  });

  it('can deactivate a service via active flag', async () => {
    const service = Service.create({
      name: 'Revisão',
      category: 'mechanical',
      priceInCents: 20000,
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
      priceInCents: 9990,
    });
    const b = Service.create({
      name: 'Balanceamento',
      category: 'tire',
      priceInCents: 4000,
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
      priceInCents: 5000,
    });
    await repository.save(service);

    await expect(
      useCase.execute(service.id, { name: 'Alinhamento', priceInCents: 6000 }),
    ).resolves.toMatchObject({ priceInCents: 6000 });
  });
});
