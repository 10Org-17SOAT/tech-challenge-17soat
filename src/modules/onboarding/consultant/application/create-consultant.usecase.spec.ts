import { ConsultantCpfAlreadyExistsError } from '../domain/errors/consultant-cpf-already-exists.error';
import { InMemoryConsultantRepository } from '../__test__/in-memory-consultant.repository';
import { CreateConsultantUseCase } from './create-consultant.usecase';

describe('CreateConsultantUseCase', () => {
  let repository: InMemoryConsultantRepository;
  let useCase: CreateConsultantUseCase;

  beforeEach(() => {
    repository = new InMemoryConsultantRepository();
    useCase = new CreateConsultantUseCase(repository);
  });

  it('creates a consultant and persists it', async () => {
    const consultant = await useCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });

    await expect(repository.findById(consultant.id)).resolves.toBe(consultant);
  });

  it('rejects a CPF already used by an active consultant', async () => {
    await useCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });

    await expect(
      useCase.execute({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Outra Pessoa',
        cpf: '529.982.247-25',
        phone: '11912345678',
      }),
    ).rejects.toBeInstanceOf(ConsultantCpfAlreadyExistsError);
  });
});
