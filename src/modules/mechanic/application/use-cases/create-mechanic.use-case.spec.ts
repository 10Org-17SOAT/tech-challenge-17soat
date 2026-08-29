import { CreateMechanicUseCase } from './create-mechanic.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { DuplicateCpfException } from '../../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';
import type { CreateMechanicInput } from '../dto/mechanic.dto';

describe('CreateMechanicUseCase', () => {
  let repository: InMemoryMechanicRepository;
  let useCase: CreateMechanicUseCase;

  const validInput: CreateMechanicInput = {
    name: 'John Doe',
    cpf: '11144477735',
    email: 'john.doe@example.com',
    phone: { countryCode: '55', areaCode: '11', number: '912345678' },
    specialties: ['mechanical', 'electrical'],
    hireDate: new Date('2024-01-15T00:00:00.000Z'),
  };

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    useCase = new CreateMechanicUseCase(repository);
  });

  it('creates a mechanic and returns the response DTO', async () => {
    const result = await useCase.execute(validInput);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('John Doe');
    expect(result.cpf).toBe('11144477735');
    expect(result.email).toBe('john.doe@example.com');
    expect(result.phone).toEqual({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });
    expect(result.specialties).toEqual(['mechanical', 'electrical']);
    expect(result.availability).toBe(MECHANIC_AVAILABILITY.Available);
    expect(result.availableSince).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('currentServiceOrderId');
  });

  it('rejects a duplicate active CPF', async () => {
    await useCase.execute(validInput);

    await expect(
      useCase.execute({
        ...validInput,
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
      }),
    ).rejects.toBeInstanceOf(DuplicateCpfException);
  });

  it('rejects invalid fields with a domain exception', async () => {
    await expect(
      useCase.execute({ ...validInput, cpf: '123' }),
    ).rejects.toThrow();
  });
});