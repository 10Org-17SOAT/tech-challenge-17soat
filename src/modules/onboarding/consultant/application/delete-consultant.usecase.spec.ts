import { ConsultantNotFoundError } from '../domain/errors/consultant-not-found.error';
import { InMemoryConsultantRepository } from '../__test__/in-memory-consultant.repository';
import { CreateConsultantUseCase } from './create-consultant.usecase';
import { DeleteConsultantUseCase } from './delete-consultant.usecase';
import { GetConsultantUseCase } from './get-consultant.usecase';

describe('DeleteConsultantUseCase', () => {
  let repository: InMemoryConsultantRepository;
  let createUseCase: CreateConsultantUseCase;
  let getUseCase: GetConsultantUseCase;
  let useCase: DeleteConsultantUseCase;

  beforeEach(() => {
    repository = new InMemoryConsultantRepository();
    createUseCase = new CreateConsultantUseCase(repository);
    getUseCase = new GetConsultantUseCase(repository);
    useCase = new DeleteConsultantUseCase(repository);
  });

  it('soft deletes a consultant', async () => {
    const created = await createUseCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });

    await useCase.execute(created.id);

    await expect(getUseCase.execute(created.id)).rejects.toBeInstanceOf(
      ConsultantNotFoundError,
    );
  });

  it('throws when the consultant does not exist', async () => {
    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      ConsultantNotFoundError,
    );
  });
});
