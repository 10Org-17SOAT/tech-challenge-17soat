import { ConsultantNotFoundError } from '../domain/errors/consultant-not-found.error';
import { InMemoryConsultantRepository } from '../__test__/in-memory-consultant.repository';
import { CreateConsultantUseCase } from './create-consultant.usecase';
import { UpdateConsultantUseCase } from './update-consultant.usecase';

describe('UpdateConsultantUseCase', () => {
  let repository: InMemoryConsultantRepository;
  let createUseCase: CreateConsultantUseCase;
  let useCase: UpdateConsultantUseCase;

  beforeEach(() => {
    repository = new InMemoryConsultantRepository();
    createUseCase = new CreateConsultantUseCase(repository);
    useCase = new UpdateConsultantUseCase(repository);
  });

  it('updates name and phone', async () => {
    const created = await createUseCase.execute({
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });

    const updated = await useCase.execute(created.id, {
      name: 'Carlos Silva',
      phone: '11911112222',
    });

    expect(updated.name).toBe('Carlos Silva');
    expect(updated.phone).toBe('11911112222');
    expect(updated.cpf).toBe('52998224725');
  });

  it('throws when the consultant does not exist', async () => {
    await expect(
      useCase.execute('missing-id', { name: 'X' }),
    ).rejects.toBeInstanceOf(ConsultantNotFoundError);
  });
});
