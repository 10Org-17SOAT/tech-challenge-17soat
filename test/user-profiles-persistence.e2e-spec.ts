import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { AppModule } from './../src/app.module';
import { DATABASE_CONNECTION } from './../src/shared/config/database/database.constants';
import type { DrizzleDatabase } from './../src/shared/config/database/drizzle.provider';
import { users } from './../src/modules/auth/infrastructure/persistence/schema';
import { UserRole } from './../src/modules/auth/roles/role.enum';
import { User } from './../src/modules/auth/domain/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './../src/modules/auth/domain/user.repository';
import { UserEmailAlreadyExistsError } from './../src/modules/auth/domain/errors/user-errors';
import { Customer } from './../src/modules/onboarding/customer/domain/customer.entity';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from './../src/modules/onboarding/customer/domain/repository/customer.repository';
import {
  DuplicateDocumentException,
  DuplicateEmailException as DuplicateCustomerEmailException,
} from './../src/modules/onboarding/customer/domain/exceptions/customer.exceptions';
import { PersonType } from './../src/modules/onboarding/customer/domain/value-objects/person-type.enum';
import { Document } from './../src/modules/onboarding/customer/domain/value-objects/document.value-object';
import { Email } from './../src/modules/onboarding/customer/domain/value-objects/email.value-object';
import { Phone } from './../src/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { Address } from './../src/modules/onboarding/customer/domain/value-objects/address.value-object';
import { Consultant } from './../src/modules/onboarding/consultant/domain/consultant.entity';
import {
  CONSULTANT_REPOSITORY,
  type ConsultantRepository,
} from './../src/modules/onboarding/consultant/domain/consultant.repository';
import { StockKeeper } from './../src/modules/stock/stock-keepers/domain/stock-keeper.entity';
import {
  STOCK_KEEPER_REPOSITORY,
  type StockKeeperRepository,
} from './../src/modules/stock/stock-keepers/domain/stock-keeper.repository';
import { Mechanic } from './../src/modules/mechanic/domain/mechanic.entity';
import {
  MECHANIC_REPOSITORY,
  type MechanicRepository,
} from './../src/modules/mechanic/domain/repository/mechanic.repository';
import { DuplicateEmailException as DuplicateMechanicEmailException } from './../src/modules/mechanic/domain/exceptions/mechanic.exceptions';
import { CLEANUP_TABLES, uniqueCpf } from './fixtures';

// Every profile now lives in `users`, so these adapters share one table and
// its unique indexes. Each path here is unreachable over HTTP — use cases look
// for duplicates first — so the adapters are exercised directly against a
// real Postgres.
describe('User profiles persistence (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDatabase;
  let userRepository: UserRepository;
  let customerRepository: CustomerRepository;
  let consultantRepository: ConsultantRepository;
  let stockKeeperRepository: StockKeeperRepository;
  let mechanicRepository: MechanicRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get<DrizzleDatabase>(DATABASE_CONNECTION);
    userRepository = app.get<UserRepository>(USER_REPOSITORY);
    customerRepository = app.get<CustomerRepository>(CUSTOMER_REPOSITORY);
    consultantRepository = app.get<ConsultantRepository>(CONSULTANT_REPOSITORY);
    stockKeeperRepository = app.get<StockKeeperRepository>(
      STOCK_KEEPER_REPOSITORY,
    );
    mechanicRepository = app.get<MechanicRepository>(MECHANIC_REPOSITORY);
  });

  beforeEach(async () => {
    for (const table of CLEANUP_TABLES) {
      await db.execute(sql.raw(`DELETE FROM ${table}`));
    }
  });

  afterAll(() => app.close());

  /** A bare account, as `POST /user` leaves it before any profile exists. */
  const givenAccount = async (
    role: UserRole,
    email = `account-${randomUUID()}@example.com`,
  ): Promise<string> => {
    const userId = randomUUID();
    await db.insert(users).values({
      user_id: userId,
      name: 'Conta sem perfil',
      email,
      password_hash: 'test-password-hash',
      role_id: role,
    });
    return userId;
  };

  const makeCustomer = (
    userId: string,
    overrides?: { document?: string; email?: string; name?: string },
  ): Customer =>
    Customer.create({
      userId,
      personType: PersonType.CPF,
      document: new Document(overrides?.document ?? uniqueCpf()),
      name: overrides?.name ?? 'Ana Souza',
      email: new Email(overrides?.email ?? `cliente-${userId}@example.com`),
      phone: new Phone({
        countryCode: '55',
        areaCode: '11',
        number: '999998888',
      }),
      address: new Address({
        street: 'Rua das Flores',
        number: '100',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01001000',
      }),
    });

  const givenCustomer = async (
    overrides?: Parameters<typeof makeCustomer>[1],
  ): Promise<Customer> =>
    customerRepository.save(
      makeCustomer(await givenAccount(UserRole.CUSTOMER), overrides),
    );

  describe('DrizzleCustomerRepository', () => {
    it('finds a saved customer by id and by document', async () => {
      const customer = await givenCustomer();
      const document = customer.getDocument().getValue();

      await expect(
        customerRepository.findById(customer.getId()),
      ).resolves.toMatchObject({ id: customer.getId() });
      await expect(
        customerRepository.findByDocument(document),
      ).resolves.toMatchObject({ id: customer.getId() });
    });

    it('hides accounts whose customer profile was not created yet', async () => {
      const pending = await givenAccount(UserRole.CUSTOMER);
      const customer = await givenCustomer();

      const page = await customerRepository.findAll({ page: 1, limit: 10 });

      expect(page.data.map((c) => c.getId())).toEqual([customer.getId()]);
      expect(page.total).toBe(1);
      await expect(customerRepository.findById(pending)).resolves.toBeNull();
    });

    it('filters the listing by person type, name, document and email', async () => {
      const ana = await givenCustomer({ name: 'Ana Souza' });
      await givenCustomer({ name: 'Bruno Lima' });

      const byFilter = async (
        filters: Parameters<CustomerRepository['findAll']>[0]['filters'],
      ) =>
        (await customerRepository.findAll({ page: 1, limit: 10, filters }))
          .data;

      await expect(
        byFilter({ personType: PersonType.CPF }),
      ).resolves.toHaveLength(2);
      await expect(
        byFilter({ personType: PersonType.CNPJ }),
      ).resolves.toHaveLength(0);
      await expect(byFilter({ name: 'ana' })).resolves.toEqual([
        expect.objectContaining({ id: ana.getId() }),
      ]);
      await expect(
        byFilter({ document: ana.getDocument().getValue() }),
      ).resolves.toEqual([expect.objectContaining({ id: ana.getId() })]);
      await expect(
        byFilter({ email: ana.getEmail().getValue() }),
      ).resolves.toEqual([expect.objectContaining({ id: ana.getId() })]);
    });

    it('soft deletes a customer', async () => {
      const customer = await givenCustomer();

      await customerRepository.delete(customer.getId());

      await expect(
        customerRepository.findById(customer.getId()),
      ).resolves.toBeNull();
    });

    it('reports a document held by another active user as a duplicate document', async () => {
      const existing = await givenCustomer();
      const userId = await givenAccount(UserRole.CUSTOMER);

      await expect(
        customerRepository.save(
          makeCustomer(userId, {
            document: existing.getDocument().getValue(),
          }),
        ),
      ).rejects.toBeInstanceOf(DuplicateDocumentException);
    });

    it('reports an email held by another active user as a duplicate email', async () => {
      await givenAccount(UserRole.ADMIN, 'taken@example.com');
      const userId = await givenAccount(UserRole.CUSTOMER);

      await expect(
        customerRepository.save(
          makeCustomer(userId, { email: 'Taken@Example.com' }),
        ),
      ).rejects.toBeInstanceOf(DuplicateCustomerEmailException);
    });

    it('refuses to write a profile onto an account with another role', async () => {
      const userId = await givenAccount(UserRole.MECHANIC);

      await expect(
        customerRepository.save(makeCustomer(userId)),
      ).rejects.toThrow('Customer user does not exist or has another role.');
    });
  });

  describe('DrizzleUserRepository', () => {
    const makeUser = (email: string, role = UserRole.ADMIN): User =>
      User.create({
        name: 'Usuario',
        email,
        password_hash: 'test-password-hash',
        role_id: role,
      });

    it('reports an email already used by an active user, ignoring case', async () => {
      await userRepository.save(makeUser('same@example.com'));

      await expect(
        userRepository.save(makeUser('SAME@example.com')),
      ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);
    });

    it('lets a soft-deleted user email be reused', async () => {
      const first = makeUser('reused@example.com');
      await userRepository.save(first);
      await userRepository.delete(first.user_id);

      await expect(
        userRepository.save(makeUser('reused@example.com')),
      ).resolves.toBeUndefined();
    });

    it('does not mistake other constraint violations for a duplicate email', async () => {
      const unknownRole = 99 as UserRole;

      await expect(
        userRepository.save(makeUser('orphan@example.com', unknownRole)),
      ).rejects.not.toBeInstanceOf(UserEmailAlreadyExistsError);
    });
  });

  describe('DrizzleConsultantRepository', () => {
    const makeConsultant = (userId: string, name = 'Carla Menezes') =>
      Consultant.create({
        userId,
        name,
        cpf: uniqueCpf(),
        phone: '11987654321',
      });

    it('filters the listing by name and hides accounts without a profile', async () => {
      await givenAccount(UserRole.CONSULTANT);
      const carla = makeConsultant(await givenAccount(UserRole.CONSULTANT));
      await consultantRepository.save(carla);
      await consultantRepository.save(
        makeConsultant(await givenAccount(UserRole.CONSULTANT), 'Diego Alves'),
      );

      const page = await consultantRepository.findMany({
        page: 1,
        limit: 10,
        name: 'carla',
      });

      expect(page.total).toBe(1);
      expect(page.items.map((c) => c.id)).toEqual([carla.id]);
    });

    it('refuses to write a profile onto an account with another role', async () => {
      const userId = await givenAccount(UserRole.CUSTOMER);

      await expect(
        consultantRepository.save(makeConsultant(userId)),
      ).rejects.toThrow('Consultant user does not exist or has another role.');
    });

    it('fails fast on a profile row without a phone', async () => {
      const userId = await givenAccount(UserRole.CONSULTANT);
      await db
        .update(users)
        .set({ document: uniqueCpf() })
        .where(eq(users.user_id, userId));

      await expect(consultantRepository.findById(userId)).rejects.toThrow(
        'Consultant user is missing a document or phone.',
      );
    });
  });

  describe('DrizzleStockKeeperRepository', () => {
    const makeStockKeeper = (userId: string) =>
      StockKeeper.create({
        userId,
        name: 'Estoquista',
        cpf: uniqueCpf(),
        phone: '11987654321',
      });

    it('refuses to write a profile onto an account with another role', async () => {
      const userId = await givenAccount(UserRole.CONSULTANT);

      await expect(
        stockKeeperRepository.save(makeStockKeeper(userId)),
      ).rejects.toThrow(
        'Stock keeper user does not exist or has another role.',
      );
    });

    it('fails fast on a profile row without a phone', async () => {
      const userId = await givenAccount(UserRole.STOCK_KEEPER);
      await db
        .update(users)
        .set({ document: uniqueCpf() })
        .where(eq(users.user_id, userId));

      await expect(stockKeeperRepository.findById(userId)).rejects.toThrow(
        'Stock keeper user is missing a document or phone.',
      );
    });
  });

  describe('DrizzleMechanicRepository', () => {
    const makeMechanic = (userId: string, email: string) =>
      Mechanic.create({
        userId,
        name: 'Bruno Mecanico',
        cpf: uniqueCpf(),
        email,
        phone: { countryCode: '55', areaCode: '11', number: '912345678' },
        specialties: ['mechanical'],
        hireDate: new Date('2024-01-15T00:00:00.000Z'),
      });

    it('reports an email held by another active user as a duplicate email', async () => {
      await givenAccount(UserRole.ADMIN, 'busy@example.com');
      const userId = await givenAccount(UserRole.MECHANIC);

      await expect(
        mechanicRepository.save(makeMechanic(userId, 'busy@example.com')),
      ).rejects.toBeInstanceOf(DuplicateMechanicEmailException);
    });

    it('refuses to write a profile onto an account with another role', async () => {
      const userId = await givenAccount(UserRole.CUSTOMER);

      await expect(
        mechanicRepository.save(
          makeMechanic(userId, `mecanico-${userId}@example.com`),
        ),
      ).rejects.toThrow('Mechanic user does not exist or has another role.');
    });
  });
});
