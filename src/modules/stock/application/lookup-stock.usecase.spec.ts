import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { PurchaseRequestNeeded } from '../domain/events/purchase-request-needed.event';
import { StockMovement } from '../domain/stock-movement.entity';
import { Supply } from '../domain/supply.entity';
import { InMemoryStockMovementRepository } from '../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';
import { RecordingDomainEventPublisher } from '../__test__/recording-domain-event.publisher';
import { LookupStockUseCase } from './lookup-stock.usecase';

const TEST_PERFORMER = { id: '11111111-1111-1111-1111-111111111111', name: 'Estoquista Teste' };

describe('LookupStockUseCase', () => {
  let supplyRepository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: LookupStockUseCase;

  const givenSupply = async (): Promise<Supply> => {
    const supply = Supply.create({
      name: 'Correia dentada',
      priceInCents: 7900,
    });
    await supplyRepository.save(supply);
    return supply;
  };

  beforeEach(() => {
    supplyRepository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    publisher = new RecordingDomainEventPublisher();
    useCase = new LookupStockUseCase(
      supplyRepository,
      movementRepository,
      publisher,
    );
  });

  it('returns the available balance of a supply with movements', async () => {
    const supply = await givenSupply();
    await movementRepository.save(StockMovement.in(supply.id, 10, TEST_PERFORMER));
    await movementRepository.save(StockMovement.reserve(supply.id, 4, 'OS-1'));

    await expect(useCase.execute(supply.id)).resolves.toEqual({
      supplyId: supply.id,
      availableBalance: 6,
    });
  });

  it('returns a zero balance and publishes PurchaseRequestNeeded when the supply has no IN movements', async () => {
    const supply = await givenSupply();

    const result = await useCase.execute(supply.id);

    expect(result.availableBalance).toBe(0);
    expect(publisher.events).toHaveLength(1);
    const [event] = publisher.events;
    expect(event).toBeInstanceOf(PurchaseRequestNeeded);
    expect(event.name).toBe('stock.purchase-request-needed');
    expect((event as PurchaseRequestNeeded).supplyId).toBe(supply.id);
  });

  it('publishes PurchaseRequestNeeded when every unit is reserved away', async () => {
    const supply = await givenSupply();
    await movementRepository.save(StockMovement.in(supply.id, 5, TEST_PERFORMER));
    await movementRepository.save(StockMovement.reserve(supply.id, 5, 'OS-2'));

    const result = await useCase.execute(supply.id);

    expect(result.availableBalance).toBe(0);
    expect(publisher.events).toHaveLength(1);
  });

  it('does not publish PurchaseRequestNeeded when the balance is positive', async () => {
    const supply = await givenSupply();
    await movementRepository.save(StockMovement.in(supply.id, 1, TEST_PERFORMER));

    await useCase.execute(supply.id);

    expect(publisher.events).toEqual([]);
  });

  it('throws 404 without publishing an event when the supply id is not in the catalogue', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      SupplyNotFoundError,
    );

    expect(publisher.events).toEqual([]);
  });

  it('treats a soft deleted supply as absent from the catalogue', async () => {
    const supply = await givenSupply();
    supply.delete();
    await supplyRepository.save(supply);

    await expect(useCase.execute(supply.id)).rejects.toBeInstanceOf(
      SupplyNotFoundError,
    );
    expect(publisher.events).toEqual([]);
  });
});
