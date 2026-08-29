import { FindAvailableMechanicUseCase } from './find-available-mechanic.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { RecordingDomainEventPublisher } from '../../__test__/recording-domain-event.publisher';
import { NoAvailableMechanicException } from '../exceptions/mechanic-application.exception';
import { InvalidMechanicException } from '../../domain/exceptions/mechanic.exceptions';
import { MechanicAllocated } from '../../domain/events/mechanic-allocated.event';
import { Mechanic } from '../../domain/mechanic.entity';
import { Cpf } from '../../domain/value-objects/cpf.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Phone } from '../../domain/value-objects/phone.value-object';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

describe('FindAvailableMechanicUseCase', () => {
  let repository: InMemoryMechanicRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: FindAvailableMechanicUseCase;

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    publisher = new RecordingDomainEventPublisher();
    useCase = new FindAvailableMechanicUseCase(repository, publisher);
  });

  const seedAvailableMechanic = (
    id: string,
    availableSince: Date,
    specialties: string[] = ['mechanical'],
  ): Mechanic => {
    const mechanic = Mechanic.restore({
      id,
      name: `Mechanic ${id.slice(0, 4)}`,
      cpf: new Cpf('11144477735'),
      email: new Email(`mechanic-${id.slice(0, 4)}@example.com`),
      phone: new Phone({
        countryCode: '55',
        areaCode: '11',
        number: '912345678',
      }),
      specialties: specialties as never,
      hireDate: new Date('2024-01-15T00:00:00.000Z'),
      availability: MECHANIC_AVAILABILITY.Available,
      availableSince,
      currentServiceOrderId: null,
      createdAt: availableSince,
      updatedAt: availableSince,
      deletedAt: null,
    });
    repository.mechanics.set(id, mechanic);
    return mechanic;
  };

  it('claims the mechanic with the oldest availableSince (FIFO)', async () => {
    const older = seedAvailableMechanic(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      new Date('2024-01-01T00:00:00.000Z'),
    );
    seedAvailableMechanic(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
      new Date('2024-02-01T00:00:00.000Z'),
    );

    const result = await useCase.execute({ serviceOrderId: 'OS-1' });

    expect(result.getId()).toBe(older.getId());
    expect(result.getAvailability()).toBe(MECHANIC_AVAILABILITY.Allocated);
    expect(result.getCurrentServiceOrderId()).toBe('OS-1');
  });

  it('claims only a mechanic whose specialties include the requested specialty', async () => {
    seedAvailableMechanic(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      new Date('2024-01-01T00:00:00.000Z'),
      ['mechanical'],
    );
    const electrical = seedAvailableMechanic(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
      new Date('2024-02-01T00:00:00.000Z'),
      ['electrical'],
    );

    const result = await useCase.execute({
      serviceOrderId: 'OS-1',
      specialty: 'electrical',
    });

    expect(result.getId()).toBe(electrical.getId());
  });

  it('throws NoAvailableMechanicException when none is available', async () => {
    const allocated = seedAvailableMechanic(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      new Date('2024-01-01T00:00:00.000Z'),
    );
    allocated.claim('OS-0');

    await expect(
      useCase.execute({ serviceOrderId: 'OS-1' }),
    ).rejects.toBeInstanceOf(NoAvailableMechanicException);
  });

  it('publishes MechanicAllocated after a successful claim', async () => {
    const mechanic = seedAvailableMechanic(
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      new Date('2024-01-01T00:00:00.000Z'),
    );

    await useCase.execute({ serviceOrderId: 'OS-1' });

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(MechanicAllocated);
    const event = publisher.events[0] as MechanicAllocated;
    expect(event.mechanicId).toBe(mechanic.getId());
    expect(event.serviceOrderId).toBe('OS-1');
  });

  it('rejects an empty serviceOrderId', async () => {
    await expect(
      useCase.execute({ serviceOrderId: '   ' }),
    ).rejects.toBeInstanceOf(InvalidMechanicException);
  });
});