import { UpdateMechanicProfileUseCase } from './update-mechanic-profile.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';
import { Mechanic } from '../../domain/mechanic.entity';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

describe('UpdateMechanicProfileUseCase', () => {
  let repository: InMemoryMechanicRepository;
  let useCase: UpdateMechanicProfileUseCase;

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    useCase = new UpdateMechanicProfileUseCase(repository);
  });

  const seedMechanic = async (): Promise<Mechanic> => {
    const mechanic = Mechanic.create({
      name: 'John Doe',
      cpf: '11144477735',
      email: 'john.doe@example.com',
      phone: { countryCode: '55', areaCode: '11', number: '912345678' },
      specialties: ['mechanical'],
      hireDate: new Date('2024-01-15T00:00:00.000Z'),
    });
    await repository.save(mechanic);
    return mechanic;
  };

  it('updates only the provided fields and preserves state columns', async () => {
    const mechanic = await seedMechanic();
    const availableSince = mechanic.getAvailableSince();

    const result = await useCase.execute({
      id: mechanic.getId(),
      data: { name: 'Jane Doe', email: 'jane.doe@example.com' },
    });

    expect(result.name).toBe('Jane Doe');
    expect(result.email).toBe('jane.doe@example.com');
    expect(result.cpf).toBe('11144477735');
    expect(result.availability).toBe(MECHANIC_AVAILABILITY.Available);
    expect(result.availableSince).toEqual(availableSince);
    expect(result.phone).toEqual({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    });
  });

  it('throws MechanicNotFoundException for an unknown id', async () => {
    await expect(
      useCase.execute({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        data: { name: 'Jane Doe' },
      }),
    ).rejects.toBeInstanceOf(MechanicNotFoundException);
  });

  it('rejects invalid fields with a domain exception', async () => {
    const mechanic = await seedMechanic();

    await expect(
      useCase.execute({
        id: mechanic.getId(),
        data: { email: 'not-an-email' },
      }),
    ).rejects.toThrow();
  });
});