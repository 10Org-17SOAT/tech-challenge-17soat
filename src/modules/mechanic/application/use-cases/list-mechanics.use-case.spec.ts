import { ListMechanicsUseCase } from './list-mechanics.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { Mechanic } from '../../domain/mechanic.entity';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';
import type { Specialty } from '../../domain/value-objects/specialty.enum';

// Generates VALID CPFs (same mod-11 algorithm as the Cpf value object).
const checkDigit = (digits: string, weights: number[]): number => {
  const sum = weights.reduce(
    (acc, weight, index) => acc + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

const validCpf = (base9: string): string => {
  const d1 = checkDigit(base9, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checkDigit(base9 + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base9}${d1}${d2}`;
};

const makeMechanic = (overrides: {
  name: string;
  cpf: string;
  specialties?: Specialty[];
  availability?: string;
}): Mechanic => {
  const mechanic = Mechanic.create({
    name: overrides.name,
    cpf: overrides.cpf,
    email: `${overrides.name.toLowerCase().replace(/\s/g, '.')}@example.com`,
    phone: { countryCode: '55', areaCode: '11', number: '912345678' },
    specialties: overrides.specialties ?? ['mechanical'],
    hireDate: new Date('2024-01-15T00:00:00.000Z'),
  });

  if (overrides.availability === MECHANIC_AVAILABILITY.Allocated) {
    mechanic.claim('OS-1');
  }
  if (overrides.availability === MECHANIC_AVAILABILITY.Inactive) {
    mechanic.deactivate();
  }

  return mechanic;
};

describe('ListMechanicsUseCase', () => {
  let repository: InMemoryMechanicRepository;
  let useCase: ListMechanicsUseCase;

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    useCase = new ListMechanicsUseCase(repository);
  });

  it('returns a paginated result with metadata', async () => {
    await repository.save(
      makeMechanic({ name: 'John Doe', cpf: '11144477735' }),
    );
    await repository.save(
      makeMechanic({ name: 'Jane Doe', cpf: '52998224725' }),
    );

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  it('filters by name case-insensitively (partial match)', async () => {
    await repository.save(
      makeMechanic({ name: 'John Doe', cpf: '11144477735' }),
    );
    await repository.save(
      makeMechanic({ name: 'Jane Doe', cpf: '52998224725' }),
    );

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      filters: { name: 'john' },
    });

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe('John Doe');
  });

  it('filters by specialty', async () => {
    await repository.save(
      makeMechanic({
        name: 'John Doe',
        cpf: '11144477735',
        specialties: ['mechanical'],
      }),
    );
    await repository.save(
      makeMechanic({
        name: 'Jane Doe',
        cpf: '52998224725',
        specialties: ['electrical'],
      }),
    );

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      filters: { specialty: 'electrical' },
    });

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe('Jane Doe');
  });

  it('filters by availability', async () => {
    await repository.save(
      makeMechanic({ name: 'John Doe', cpf: '11144477735' }),
    );
    await repository.save(
      makeMechanic({
        name: 'Jane Doe',
        cpf: '52998224725',
        availability: MECHANIC_AVAILABILITY.Allocated,
      }),
    );

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      filters: { availability: MECHANIC_AVAILABILITY.Allocated },
    });

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe('Jane Doe');
  });

  it('paginates results', async () => {
    for (let i = 1; i <= 3; i++) {
      await repository.save(
        makeMechanic({
          name: `Person ${i}`,
          cpf: validCpf(`00000000${i}`),
        }),
      );
    }

    const page1 = await useCase.execute({ page: 1, limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(3);
    expect(page1.totalPages).toBe(2);

    const page2 = await useCase.execute({ page: 2, limit: 2 });
    expect(page2.data).toHaveLength(1);
  });
});
