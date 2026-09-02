import { InMemoryConsultantRepository } from '../__test__/in-memory-consultant.repository';
import { CreateConsultantUseCase } from './create-consultant.usecase';
import { ListConsultantsUseCase } from './list-consultants.usecase';

describe('ListConsultantsUseCase', () => {
  let repository: InMemoryConsultantRepository;
  let createUseCase: CreateConsultantUseCase;
  let useCase: ListConsultantsUseCase;

  beforeEach(() => {
    repository = new InMemoryConsultantRepository();
    createUseCase = new CreateConsultantUseCase(repository);
    useCase = new ListConsultantsUseCase(repository);
  });

  it('paginates active consultants', async () => {
    await createUseCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await createUseCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Ana Consultora',
      cpf: '15350946056',
      phone: '11911112222',
    });

    const result = await useCase.execute({ page: 1, limit: 1 });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it('filters by name (case-insensitive)', async () => {
    await createUseCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await createUseCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Ana Consultora',
      cpf: '15350946056',
      phone: '11911112222',
    });

    const result = await useCase.execute({ page: 1, limit: 20, name: 'ana' });

    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Ana Consultora');
  });
});
