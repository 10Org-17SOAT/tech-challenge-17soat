import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { httpAs, tokenFor } from './fixtures';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { MECHANIC_REPOSITORY } from '../src/modules/mechanic/domain/repository/mechanic.repository';
import { InMemoryMechanicRepository } from '../src/modules/mechanic/__test__/in-memory-mechanic.repository';
import { Mechanic } from '../src/modules/mechanic/domain/mechanic.entity';
import { UserRole } from '../src/modules/auth/public/roles';

/**
 * E2E suite running against the real AppModule wiring with the repository
 * swapped for an in-memory fake (no database required). The DATABASE_CONNECTION
 * provider is never instantiated because nothing injects it after the override.
 */
const SEEDED_MECHANIC_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Mechanics (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let repository: InMemoryMechanicRepository;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MECHANIC_REPOSITORY)
      .useClass(InMemoryMechanicRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    // The suite acts as the mechanic it seeds: ownership checks resolve the
    // caller's profile from the token, so a random account would be a stranger.
    token = tokenFor(app, UserRole.MECHANIC, SEEDED_MECHANIC_USER_ID);

    repository =
      moduleFixture.get<InMemoryMechanicRepository>(MECHANIC_REPOSITORY);
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface MechanicResponse {
    id: string;
    name: string;
    cpf: string;
    email: string;
    phone: { countryCode: string; areaCode: string | null; number: string };
    specialties: string[];
    hireDate: string;
    availability: string;
    availableSince: string;
    createdAt: string;
    updatedAt: string;
    // Excluded by design — asserted as absent in the response.
    deletedAt?: string;
    currentServiceOrderId?: string;
  }

  interface PaginatedResponse {
    data: MechanicResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  const mechanicBody = (res: request.Response) => res.body as MechanicResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;

  // Generates VALID CPFs (same mod-11 algorithm as the Cpf value object),
  // so paginated scenarios can create many unique mechanics.
  const checkDigit = (digits: string, weights: number[]): number => {
    const sum = weights.reduce(
      (acc, weight, index) => acc + Number(digits[index]) * weight,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const validCpf = (base9: string): string => {
    const d1 = checkDigit(base9, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = checkDigit(base9 + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return `${base9}${d1}${d2}`;
  };

  const createPayload = (overrides: Record<string, unknown> = {}) => ({
    userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'John Doe',
    cpf: validCpf('111444777'),
    email: 'john.doe@example.com',
    phone: { countryCode: '55', areaCode: '11', number: '912345678' },
    specialties: ['mechanical'],
    hireDate: '2024-01-15T00:00:00.000Z',
    ...overrides,
  });

  const seedMechanic = async (overrides: Record<string, unknown> = {}) => {
    const mechanic = Mechanic.create({
      userId: SEEDED_MECHANIC_USER_ID,
      name: 'John Doe',
      cpf: validCpf('111444777'),
      email: 'john.doe@example.com',
      phone: { countryCode: '55', areaCode: '11', number: '912345678' },
      specialties: ['mechanical'],
      hireDate: new Date('2024-01-15T00:00:00.000Z'),
      ...overrides,
    });
    await repository.save(mechanic);
    return mechanic;
  };

  describe('POST /mechanics', () => {
    it('creates a mechanic in AVAILABLE state with availableSince set', async () => {
      const res = await http().post('/mechanics').send(createPayload());

      expect(res.status).toBe(201);
      const body = mechanicBody(res);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('John Doe');
      expect(body.cpf).toBe(validCpf('111444777'));
      expect(body.email).toBe('john.doe@example.com');
      expect(body.phone).toEqual({
        countryCode: '55',
        areaCode: '11',
        number: '912345678',
      });
      expect(body.specialties).toEqual(['mechanical']);
      expect(body.availability).toBe('AVAILABLE');
      expect(body.availableSince).toBeDefined();
      expect(body.deletedAt).toBeUndefined();
      expect(body.currentServiceOrderId).toBeUndefined();
    });

    it('rejects an invalid payload with 400', async () => {
      const res = await http()
        .post('/mechanics')
        .send(createPayload({ cpf: '123', specialties: [] }));

      expect(res.status).toBe(400);
    });

    it('rejects unknown fields with 400 (strict schema)', async () => {
      const res = await http()
        .post('/mechanics')
        .send(createPayload({ availability: 'ALLOCATED' }));

      expect(res.status).toBe(400);
    });

    it('rejects an invalid phone with 400', async () => {
      const res = await http()
        .post('/mechanics')
        .send(
          createPayload({
            phone: { countryCode: '55', areaCode: '1', number: '123' },
          }),
        );

      expect(res.status).toBe(400);
    });

    it('rejects a duplicate active CPF with 409', async () => {
      await seedMechanic();

      const res = await http().post('/mechanics').send(createPayload());

      expect(res.status).toBe(409);
    });
  });

  describe('GET /mechanics/:id', () => {
    it('returns an existing mechanic', async () => {
      const mechanic = await seedMechanic();

      const res = await http().get(`/mechanics/${mechanic.getId()}`);

      expect(res.status).toBe(200);
      expect(mechanicBody(res).id).toBe(mechanic.getId());
    });

    it('returns 404 for an unknown id', async () => {
      const res = await http().get(
        '/mechanics/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      );

      expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed uuid', async () => {
      const res = await http().get('/mechanics/not-a-uuid');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /mechanics', () => {
    it('returns a paginated list', async () => {
      await seedMechanic();
      await seedMechanic({ cpf: validCpf('529982247') });

      const res = await http().get('/mechanics?page=1&limit=10');

      expect(res.status).toBe(200);
      const body = pageBody(res);
      expect(body.total).toBe(2);
      expect(body.data).toHaveLength(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
      expect(body.totalPages).toBe(1);
    });

    it('filters by name, specialty, and availability', async () => {
      await seedMechanic();
      const electrical = await seedMechanic({
        cpf: validCpf('529982247'),
        specialties: ['electrical'],
      });
      electrical.claim('OS-1');

      const byName = await http().get('/mechanics?name=john');
      expect(pageBody(byName).total).toBe(2);

      const bySpecialty = await http().get('/mechanics?specialty=electrical');
      expect(pageBody(bySpecialty).total).toBe(1);
      expect(pageBody(bySpecialty).data[0].specialties).toEqual(['electrical']);

      const byAvailability = await http().get(
        '/mechanics?availability=ALLOCATED',
      );
      expect(pageBody(byAvailability).total).toBe(1);
      expect(pageBody(byAvailability).data[0].availability).toBe('ALLOCATED');
    });

    it('rejects an invalid query with 400', async () => {
      const res = await http().get('/mechanics?limit=0');

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /mechanics/:id', () => {
    it('updates profile fields', async () => {
      const mechanic = await seedMechanic();

      const res = await http()
        .patch(`/mechanics/${mechanic.getId()}`)
        .send({ name: 'Jane Doe', specialties: ['electrical', 'painting'] });

      expect(res.status).toBe(200);
      const body = mechanicBody(res);
      expect(body.name).toBe('Jane Doe');
      expect(body.specialties).toEqual(['electrical', 'painting']);
      expect(body.cpf).toBe(validCpf('111444777'));
    });

    it('rejects cpf in the payload with 400 (never accepted)', async () => {
      const mechanic = await seedMechanic();

      const res = await http()
        .patch(`/mechanics/${mechanic.getId()}`)
        .send({ cpf: validCpf('529982247') });

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await http()
        .patch('/mechanics/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .send({ name: 'Jane Doe' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /mechanics/:id', () => {
    it('deactivates a mechanic with 204', async () => {
      const mechanic = await seedMechanic();

      const res = await http().delete(`/mechanics/${mechanic.getId()}`);

      expect(res.status).toBe(204);
      const after = await http().get(`/mechanics/${mechanic.getId()}`);
      expect(after.status).toBe(404);
    });

    it('returns 409 for an allocated mechanic', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim('OS-1');

      const res = await http().delete(`/mechanics/${mechanic.getId()}`);

      expect(res.status).toBe(409);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await http().delete(
        '/mechanics/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      );

      expect(res.status).toBe(404);
    });

    it('returns 404 for an already deactivated mechanic', async () => {
      const mechanic = await seedMechanic();
      await http().delete(`/mechanics/${mechanic.getId()}`);

      const res = await http().delete(`/mechanics/${mechanic.getId()}`);

      expect(res.status).toBe(404);
    });

    it('frees the CPF for re-registration after deactivation', async () => {
      const mechanic = await seedMechanic();
      await http().delete(`/mechanics/${mechanic.getId()}`);

      const res = await http().post('/mechanics').send(createPayload());

      expect(res.status).toBe(201);
    });
  });

  describe('POST /mechanics/claim', () => {
    const serviceOrderId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    it('claims an available mechanic and marks it ALLOCATED', async () => {
      const mechanic = await seedMechanic();

      const res = await http()
        .post('/mechanics/claim')
        .send({ serviceOrderId });

      expect(res.status).toBe(200);
      const body = mechanicBody(res);
      expect(body.id).toBe(mechanic.getId());
      expect(body.availability).toBe('ALLOCATED');
      expect(body.currentServiceOrderId).toBeUndefined();
    });

    it('claims a mechanic matching the requested specialty', async () => {
      await seedMechanic(); // mechanical
      const electrical = await seedMechanic({
        cpf: validCpf('529982247'),
        specialties: ['electrical'],
      });

      const res = await http()
        .post('/mechanics/claim')
        .send({ serviceOrderId, specialty: 'electrical' });

      expect(res.status).toBe(200);
      expect(mechanicBody(res).id).toBe(electrical.getId());
    });

    it('returns 404 when no mechanic is available', async () => {
      const res = await http()
        .post('/mechanics/claim')
        .send({ serviceOrderId });

      expect(res.status).toBe(404);
    });

    it('rejects an invalid payload with 400', async () => {
      const res = await http().post('/mechanics/claim').send({});

      expect(res.status).toBe(400);
    });

    it('rejects unknown fields with 400 (strict schema)', async () => {
      const res = await http()
        .post('/mechanics/claim')
        .send({ serviceOrderId, availability: 'ALLOCATED' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /mechanics/:id/release', () => {
    const serviceOrderId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    it('releases an allocated mechanic and marks it AVAILABLE', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await http()
        .post(`/mechanics/${mechanic.getId()}/release`)
        .send({ serviceOrderId });

      expect(res.status).toBe(200);
      const body = mechanicBody(res);
      expect(body.id).toBe(mechanic.getId());
      expect(body.availability).toBe('AVAILABLE');
    });

    it('returns 404 for an unknown id', async () => {
      const res = await http()
        .post('/mechanics/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/release')
        .send({ serviceOrderId });

      expect(res.status).toBe(404);
    });

    it('returns 409 when the mechanic is not allocated', async () => {
      const mechanic = await seedMechanic();

      const res = await http()
        .post(`/mechanics/${mechanic.getId()}/release`)
        .send({ serviceOrderId });

      expect(res.status).toBe(409);
    });

    it('returns 409 when the service order does not match', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await http()
        .post(`/mechanics/${mechanic.getId()}/release`)
        .send({ serviceOrderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' });

      expect(res.status).toBe(409);
    });

    it('rejects an invalid payload with 400', async () => {
      const mechanic = await seedMechanic();

      const res = await http()
        .post(`/mechanics/${mechanic.getId()}/release`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /mechanics/:id/complete-execution', () => {
    const serviceOrderId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    it('frees the mechanic when the work is reported as done', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await http()
        .post(`/mechanics/${mechanic.getId()}/complete-execution`)
        .send({ serviceOrderId });

      expect(res.status).toBe(200);
      expect(mechanicBody(res).availability).toBe('AVAILABLE');
      expect(mechanicBody(res).currentServiceOrderId).toBeUndefined();
    });

    it('returns 409 when the mechanic is not allocated to that order', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await http()
        .post(`/mechanics/${mechanic.getId()}/complete-execution`)
        .send({ serviceOrderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' });

      expect(res.status).toBe(409);
    });

    it('forbids a role outside the mechanic context', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await httpAs(app, tokenFor(app, UserRole.CUSTOMER))
        .post(`/mechanics/${mechanic.getId()}/complete-execution`)
        .send({ serviceOrderId });

      expect(res.status).toBe(403);
    });
  });

  describe('acting identity', () => {
    const OWNER_USER_ID = SEEDED_MECHANIC_USER_ID;
    const OTHER_USER_ID = 'b1ffcd88-8d1a-4fe7-aa5c-5aa8ac270b22';
    const serviceOrderId = 'c2aabb77-7e2b-4ad6-9b4d-4bb7bd160c33';

    const asMechanic = (userId: string) =>
      httpAs(app, tokenFor(app, UserRole.MECHANIC, userId));

    it('lets a mechanic complete their own execution', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await asMechanic(OWNER_USER_ID)
        .post(`/mechanics/${mechanic.getId()}/complete-execution`)
        .send({ serviceOrderId });

      expect(res.status).toBe(200);
    });

    // 403, not 404: the mechanic plainly exists — it is the caller who is
    // not entitled to act as them.
    it('forbids a mechanic completing another mechanic execution', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await asMechanic(OTHER_USER_ID)
        .post(`/mechanics/${mechanic.getId()}/complete-execution`)
        .send({ serviceOrderId });

      expect(res.status).toBe(403);
    });

    it('answers 403, not 404, when a mechanic probes an unknown id', async () => {
      const res = await http()
        .post(
          '/mechanics/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12/complete-execution',
        )
        .send({ serviceOrderId });

      expect(res.status).toBe(403);
    });

    // Someone has to be able to free an order if the mechanic goes home.
    it('lets an admin act for any mechanic', async () => {
      const mechanic = await seedMechanic();
      mechanic.claim(serviceOrderId);

      const res = await httpAs(app, tokenFor(app, UserRole.ADMIN))
        .post(`/mechanics/${mechanic.getId()}/complete-execution`)
        .send({ serviceOrderId });

      expect(res.status).toBe(200);
    });
  });
});
