import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { describeMechanicRepositoryContract } from './../src/modules/mechanic/__test__/mechanic-repository.contract';
import { MECHANIC_REPOSITORY } from './../src/modules/mechanic/domain/repository/mechanic.repository';
import type { MechanicRepository } from './../src/modules/mechanic/domain/repository/mechanic.repository';
import { DATABASE_CONNECTION } from './../src/shared/config/database/database.constants';
import type { DrizzleDatabase } from './../src/shared/config/database/drizzle.provider';
import { mechanicsTable } from './../src/modules/mechanic/infrastructure/persistence/mechanic.schema';

// Exercises the Drizzle adapter against a real Postgres: the atomic claim
// semantics (FOR UPDATE SKIP LOCKED + conditional updates) live in SQL, so the
// in-memory fake alone cannot prove them.
describe('Mechanic persistence (e2e)', () => {
  let app: INestApplication;
  let repository: MechanicRepository;
  let db: DrizzleDatabase;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    repository = app.get<MechanicRepository>(MECHANIC_REPOSITORY);
    db = app.get<DrizzleDatabase>(DATABASE_CONNECTION);
  });

  beforeEach(async () => {
    await db.delete(mechanicsTable);
  });

  afterAll(() => app.close());

  // Postgres SQLSTATE codes — asserting on them keeps these tests from passing
  // on an unrelated error (a typo would satisfy a bare `.toThrow()`).
  const CHECK_VIOLATION = '23514';

  // Drizzle wraps driver errors, so the SQLSTATE lives somewhere down the
  // `cause` chain — same reason DrizzleCustomerRepository recurses to detect
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

  describe('repository contract', () => {
    describeMechanicRepositoryContract(() => Promise.resolve({ repository }));
  });

  it('rejects an invalid availability at the database level', async () => {
    await expect(
      codeOf(
        db.insert(mechanicsTable).values({
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
          name: 'John Doe',
          cpf: '11144477735',
          email: 'john.doe@example.com',
          phone: { countryCode: '55', areaCode: '11', number: '912345678' },
          specialties: ['mechanical'],
          hireDate: new Date('2024-01-15T00:00:00.000Z'),
          availability: 'ON_VACATION',
          availableSince: new Date('2024-01-15T00:00:00.000Z'),
          currentServiceOrderId: null,
          createdAt: new Date('2024-01-15T00:00:00.000Z'),
          updatedAt: new Date('2024-01-15T00:00:00.000Z'),
          deletedAt: null,
        }),
      ),
    ).resolves.toBe(CHECK_VIOLATION);
  });
});
