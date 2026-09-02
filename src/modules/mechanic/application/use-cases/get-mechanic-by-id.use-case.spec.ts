import { GetMechanicByIdUseCase } from './get-mechanic-by-id.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';
import { Mechanic } from '../../domain/mechanic.entity';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

describe('GetMechanicByIdUseCase', () => {
  let repository: InMemoryMechanicRepository;
  let useCase: GetMechanicByIdUseCase;

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    useCase = new GetMechanicByIdUseCase(repository);
  });

  it('returns the mechanic by id', async () => {
    const mechanic = Mechanic.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'John Doe',
      cpf: '11144477735',
      email: 'john.doe@example.com',
      phone: { countryCode: '55', areaCode: '11', number: '912345678' },
      specialties: ['mechanical'],
      hireDate: new Date('2024-01-15T00:00:00.000Z'),
    });
    await repository.save(mechanic);

    const result = await useCase.execute({ id: mechanic.getId() });

    expect(result.id).toBe(mechanic.getId());
    expect(result.name).toBe('John Doe');
    expect(result.availability).toBe(MECHANIC_AVAILABILITY.Available);
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('currentServiceOrderId');
  });

  it('throws MechanicNotFoundException for an unknown id', async () => {
    await expect(
      useCase.execute({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    ).rejects.toBeInstanceOf(MechanicNotFoundException);
  });
});
