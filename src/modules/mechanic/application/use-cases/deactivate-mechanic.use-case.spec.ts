import { DeactivateMechanicUseCase } from './deactivate-mechanic.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';
import { AllocatedMechanicException } from '../../domain/exceptions/mechanic.exceptions';
import { Mechanic } from '../../domain/mechanic.entity';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

describe('DeactivateMechanicUseCase', () => {
  let repository: InMemoryMechanicRepository;
  let useCase: DeactivateMechanicUseCase;

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    useCase = new DeactivateMechanicUseCase(repository);
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

  it('deactivates a mechanic', async () => {
    const mechanic = await seedMechanic();

    await expect(
      useCase.execute({ id: mechanic.getId() }),
    ).resolves.toBeUndefined();

    const stored = await repository.findById(mechanic.getId());
    expect(stored).toBeNull();
    expect(repository.mechanics.get(mechanic.getId())?.getAvailability()).toBe(
      MECHANIC_AVAILABILITY.Inactive,
    );
    expect(
      repository.mechanics.get(mechanic.getId())?.getDeletedAt(),
    ).toBeInstanceOf(Date);
  });

  it('throws MechanicNotFoundException for an unknown id', async () => {
    await expect(
      useCase.execute({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    ).rejects.toBeInstanceOf(MechanicNotFoundException);
  });

  it('throws AllocatedMechanicException for an allocated mechanic', async () => {
    const mechanic = await seedMechanic();
    mechanic.claim('OS-1');

    await expect(
      useCase.execute({ id: mechanic.getId() }),
    ).rejects.toBeInstanceOf(AllocatedMechanicException);
  });
});
