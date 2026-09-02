import { ConsultantNotFoundError } from '../domain/errors/consultant-not-found.error';
import { InMemoryConsultantRepository } from '../__test__/in-memory-consultant.repository';
import { CreateConsultantUseCase } from './create-consultant.usecase';
import { GetConsultantUseCase } from './get-consultant.usecase';

describe('GetConsultantUseCase', () => {
  let repository: InMemoryConsultantRepository;
  let createUseCase: CreateConsultantUseCase;
  let useCase: GetConsultantUseCase;

  beforeEach(() => {
    repository = new InMemoryConsultantRepository();
    createUseCase = new CreateConsultantUseCase(repository);
    useCase = new GetConsultantUseCase(repository);
  });

  it('returns an existing consultant', async () => {
    const created = await createUseCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });

    await expect(useCase.execute(created.id)).resolves.toBe(created);
  });

  it('throws when the consultant does not exist', async () => {
    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      ConsultantNotFoundError,
    );
  });
});
