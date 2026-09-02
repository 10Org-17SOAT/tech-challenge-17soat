import { ReleaseMechanicUseCase } from './release-mechanic.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { RecordingDomainEventPublisher } from '../../__test__/recording-domain-event.publisher';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';
import {
  MechanicNotAllocatedException,
  WrongServiceOrderException,
} from '../../domain/exceptions/mechanic.exceptions';
import { MechanicReleased } from '../../domain/events/mechanic-released.event';
import { Mechanic } from '../../domain/mechanic.entity';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

describe('ReleaseMechanicUseCase', () => {
  let repository: InMemoryMechanicRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: ReleaseMechanicUseCase;

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    publisher = new RecordingDomainEventPublisher();
    useCase = new ReleaseMechanicUseCase(repository, publisher);
  });

  const seedMechanic = async (): Promise<Mechanic> => {
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
    return mechanic;
  };

  it('releases an allocated mechanic and publishes MechanicReleased', async () => {
    const mechanic = await seedMechanic();
    mechanic.claim('OS-1');

    const result = await useCase.execute({
      mechanicId: mechanic.getId(),
      serviceOrderId: 'OS-1',
    });

    expect(result.getAvailability()).toBe(MECHANIC_AVAILABILITY.Available);
    expect(result.getCurrentServiceOrderId()).toBeNull();
    expect(result.getAvailableSince()).toBeInstanceOf(Date);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toBeInstanceOf(MechanicReleased);
    const event = publisher.events[0] as MechanicReleased;
    expect(event.mechanicId).toBe(mechanic.getId());
    expect(event.serviceOrderId).toBe('OS-1');
  });

  it('throws MechanicNotFoundException for an unknown id', async () => {
    await expect(
      useCase.execute({
        mechanicId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        serviceOrderId: 'OS-1',
      }),
    ).rejects.toBeInstanceOf(MechanicNotFoundException);
  });

  it('throws MechanicNotAllocatedException for a non-allocated mechanic', async () => {
    const mechanic = await seedMechanic();

    await expect(
      useCase.execute({
        mechanicId: mechanic.getId(),
        serviceOrderId: 'OS-1',
      }),
    ).rejects.toBeInstanceOf(MechanicNotAllocatedException);
  });

  it('throws WrongServiceOrderException for a mismatched service order', async () => {
    const mechanic = await seedMechanic();
    mechanic.claim('OS-1');

    await expect(
      useCase.execute({
        mechanicId: mechanic.getId(),
        serviceOrderId: 'OS-2',
      }),
    ).rejects.toBeInstanceOf(WrongServiceOrderException);
  });
});
