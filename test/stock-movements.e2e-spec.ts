import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';
import { describeStockMovementRepositoryContract } from './../src/modules/stock/__test__/stock-movement-repository.contract';
import { StockMovement } from './../src/modules/stock/domain/stock-movement.entity';
import { STOCK_MOVEMENT_REPOSITORY } from './../src/modules/stock/domain/stock-movement.repository';
import type { StockMovementRepository } from './../src/modules/stock/domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from './../src/modules/stock/domain/supply.repository';
import type { SupplyRepository } from './../src/modules/stock/domain/supply.repository';
import { Supply } from './../src/modules/stock/domain/supply.entity';
import { DATABASE_CONNECTION } from './../src/shared/config/database/database.constants';
import type { DrizzleDatabase } from './../src/shared/config/database/drizzle.provider';
import {
  stockMovements,
  supplies,
} from './../src/modules/stock/infrastructure/persistence/schema';

const TEST_PERFORMER = { id: '11111111-1111-1111-1111-111111111111', name: 'Estoquista Teste' };

// Exercises the Drizzle adapter against a real Postgres: the balance arithmetic
// lives in SQL, so the in-memory fake alone cannot prove it.
describe('StockMovement persistence (e2e)', () => {
  let app: INestApplication;
  let repository: StockMovementRepository;
  let supplyRepository: SupplyRepository;
  let db: DrizzleDatabase;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    repository = app.get<StockMovementRepository>(STOCK_MOVEMENT_REPOSITORY);
    supplyRepository = app.get<SupplyRepository>(SUPPLY_REPOSITORY);
    db = app.get<DrizzleDatabase>(DATABASE_CONNECTION);
  });

  // Movements reference supplies, so they must go first.
  beforeEach(async () => {
    await db.delete(stockMovements);
    await db.delete(supplies);
  });

  afterAll(() => app.close());

  // Postgres SQLSTATE codes — asserting on them keeps these tests from passing
  // on an unrelated error (a typo would satisfy a bare `.toThrow()`).
  const FOREIGN_KEY_VIOLATION = '23503';
  const CHECK_VIOLATION = '23514';

  // Drizzle wraps driver errors, so the SQLSTATE lives somewhere down the
  // `cause` chain — same reason DrizzleSupplyRepository recurses to detect
  // unique violations.
  const sqlStateOf = (error: unknown): unknown => {
    if (typeof error !== 'object' || error === null) return undefined;
    const candidate = error as { code?: unknown; cause?: unknown };
    return candidate.code ?? sqlStateOf(candidate.cause);
  };

  const codeOf = async (operation: Promise<unknown>): Promise<unknown> => {
    try {
      await operation;
      throw new Error('expected the operation to be rejected, but it resolved');
    } catch (error) {
      return sqlStateOf(error);
    }
  };

  let sequence = 0;
  const createSupply = async (): Promise<string> => {
    const supply = Supply.create({
      name: `Peça e2e ${(sequence += 1)}-${randomUUID()}`,
      priceInCents: 1000,
    });
    await supplyRepository.save(supply);
    return supply.id;
  };

  describe('repository contract', () => {
    describeStockMovementRepositoryContract(() =>
      Promise.resolve({ repository, createSupply }),
    );
  });

  it('rejects a movement whose supply id does not exist', async () => {
    const orphan = StockMovement.in(randomUUID(), 5, TEST_PERFORMER);

    await expect(codeOf(repository.save(orphan))).resolves.toBe(
      FOREIGN_KEY_VIOLATION,
    );
  });

  it('rejects a non-positive quantity at the database level', async () => {
    const supplyId = await createSupply();

    await expect(
      codeOf(
        db.insert(stockMovements).values({
          id: randomUUID(),
          supplyId,
          type: 'IN',
          quantity: 0,
          serviceOrderReference: null,
          createdAt: new Date(),
        }),
      ),
    ).resolves.toBe(CHECK_VIOLATION);
  });

  it('rejects an unknown movement type at the database level', async () => {
    const supplyId = await createSupply();

    await expect(
      codeOf(
        db.insert(stockMovements).values({
          id: randomUUID(),
          supplyId,
          type: 'TRANSFER',
          quantity: 1,
          serviceOrderReference: null,
          createdAt: new Date(),
        }),
      ),
    ).resolves.toBe(CHECK_VIOLATION);
  });
});
