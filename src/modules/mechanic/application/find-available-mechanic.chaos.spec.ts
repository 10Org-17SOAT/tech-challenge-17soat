import { FindAvailableMechanicUseCase } from './use-cases/find-available-mechanic.use-case';
import { InMemoryMechanicRepository } from '../__test__/in-memory-mechanic.repository';
import { RecordingDomainEventPublisher } from '../__test__/recording-domain-event.publisher';
import { NoAvailableMechanicException } from './exceptions/mechanic-application.exception';
import { Mechanic } from '../domain/mechanic.entity';
import { MECHANIC_AVAILABILITY } from '../domain/value-objects/mechanic-availability.enum';

describe('FindAvailableMechanicUseCase chaos', () => {
  let repository: InMemoryMechanicRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: FindAvailableMechanicUseCase;

  beforeEach(() => {
    repository = new InMemoryMechanicRepository();
    publisher = new RecordingDomainEventPublisher();
    useCase = new FindAvailableMechanicUseCase(repository, publisher);
  });

  describe('concurrency: two claims racing a single available mechanic', () => {
    it('never lets both claims succeed — the mechanic is allocated exactly once', async () => {
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

      const attempts = await Promise.allSettled([
        useCase.execute({ serviceOrderId: 'OS-A' }),
        useCase.execute({ serviceOrderId: 'OS-B' }),
      ]);

      const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
      const rejected = attempts.filter((a) => a.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(NoAvailableMechanicException);

      const stored = repository.mechanics.get(mechanic.getId());
      expect(stored?.getAvailability()).toBe(MECHANIC_AVAILABILITY.Allocated);
      expect(stored?.getCurrentServiceOrderId()).toBeDefined();

      // Exactly one event: the winning claim.
      expect(publisher.events).toHaveLength(1);
    });
  });
});
