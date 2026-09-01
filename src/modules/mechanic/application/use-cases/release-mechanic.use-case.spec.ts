import { ReleaseMechanicUseCase } from './release-mechanic.use-case';
import { InMemoryMechanicRepository } from '../../__test__/in-memory-mechanic.repository';
import { RecordingDomainEventPublisher } from '../../__test__/recording-domain-event.publisher';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';
import {
  MechanicIdentityMismatchException,
  MechanicNotAllocatedException,
  WrongServiceOrderException,
} from '../../domain/exceptions/mechanic.exceptions';
import { MechanicReleased } from '../../domain/events/mechanic-released.event';
import { Mechanic } from '../../domain/mechanic.entity';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

const OWNER_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OTHER_USER_ID = 'b1ffcd88-8d1a-4fe7-aa5c-5aa8ac270b22';

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
      userId: OWNER_USER_ID,
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

  describe('acting identity', () => {
    it('lets a mechanic act on their own allocation', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim('OS-1');

      const result = await useCase.execute({
        mechanicId: mechanic.getId(),
        serviceOrderId: 'OS-1',
        actingUserId: OWNER_USER_ID,
      });

      expect(result.getId()).toBe(mechanic.getId());
    });

    it('refuses a mechanic acting on another mechanic allocation', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim('OS-1');

      await expect(
        useCase.execute({
          mechanicId: mechanic.getId(),
          serviceOrderId: 'OS-1',
          actingUserId: OTHER_USER_ID,
        }),
      ).rejects.toBeInstanceOf(MechanicIdentityMismatchException);
    });

    // No profile means no identity to match, so it is a refusal — never a
    // free pass around the rule.
    it('refuses an account with no mechanic linked', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim('OS-1');

      await expect(
        useCase.execute({
          mechanicId: mechanic.getId(),
          serviceOrderId: 'OS-1',
          actingUserId: 'c2aabb77-7e2b-4ad6-9b4d-4bb7bd160c33',
        }),
      ).rejects.toBeInstanceOf(MechanicIdentityMismatchException);
    });

    it('skips the check when no acting user is given', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim('OS-1');

      await expect(
        useCase.execute({
          mechanicId: mechanic.getId(),
          serviceOrderId: 'OS-1',
        }),
      ).resolves.toBeDefined();
    });

    it('publishes nothing when the identity does not match', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim('OS-1');

      await expect(
        useCase.execute({
          mechanicId: mechanic.getId(),
          serviceOrderId: 'OS-1',
          actingUserId: OTHER_USER_ID,
        }),
      ).rejects.toBeInstanceOf(MechanicIdentityMismatchException);

      expect(publisher.events).toHaveLength(0);
    });
  });
});
