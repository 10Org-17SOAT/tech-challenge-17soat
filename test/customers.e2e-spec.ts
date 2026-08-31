import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CUSTOMER_REPOSITORY } from '../src/modules/onboarding/customer/domain/repository/customer.repository';
import { InMemoryCustomerRepository } from '../src/modules/onboarding/customer/__test__/in-memory-customer.repository';

/**
 * E2E suite running against the real AppModule wiring with the repository
 * swapped for an in-memory fake (no database required). The DATABASE_CONNECTION
 * provider is never instantiated because nothing injects it after the override.
 */
describe('Customers (e2e)', () => {
  let app: INestApplication<App>;
  let repository: InMemoryCustomerRepository;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CUSTOMER_REPOSITORY)
      .useClass(InMemoryCustomerRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    repository =
      moduleFixture.get<InMemoryCustomerRepository>(CUSTOMER_REPOSITORY);
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  interface CustomerResponse {
    id: string;
    personType: string;
    document: string;
    name: string | null;
    corporateName: string | null;
    tradeName: string | null;
    email: string;
    phone: { countryCode: string; areaCode: string | null; number: string };
    address: Record<string, string | null>;
    createdAt: string;
    updatedAt: string;
  }

  interface PaginatedResponse {
    data: CustomerResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  const customerBody = (res: request.Response) => res.body as CustomerResponse;
  const pageBody = (res: request.Response) => res.body as PaginatedResponse;

  // Generates VALID CPFs (same mod-11 algorithm as the Document value object),
  // so paginated scenarios can create many unique customers.
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

  const validPf = {
    personType: 'CPF',
    document: '11144477735',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: { countryCode: '55', areaCode: '11', number: '912345678' },
    address: {
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01310100',
    },
  };

  const validPj = {
    personType: 'CNPJ',
    document: '11444777000161',
    corporateName: 'Acme LTDA',
    tradeName: 'Acme',
    email: 'contato@acme.com.br',
    phone: { countryCode: '55', areaCode: '11', number: '1133334444' },
    address: {
      street: 'Rua da Consolacao',
      number: '200',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01302000',
    },
  };

  describe('POST /customers', () => {
    it('creates a PF customer and returns 201', async () => {
      const body = customerBody(
        await http().post('/customers').send(validPf).expect(201),
      );

      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.personType).toBe('CPF');
      expect(body.document).toBe('11144477735');
      expect(body.name).toBe('John Doe');
      expect(body.corporateName).toBeNull();
      expect(body.phone).toEqual({
        countryCode: '55',
        areaCode: '11',
        number: '912345678',
      });
      expect(body.createdAt).toBeDefined();
      expect(body.deletedAt).toBeUndefined();
    });

    it('creates a PJ customer and returns 201', async () => {
      const body = customerBody(
        await http().post('/customers').send(validPj).expect(201),
      );

      expect(body.name).toBeNull();
      expect(body.corporateName).toBe('Acme LTDA');
      expect(body.tradeName).toBe('Acme');
    });

    it('normalizes the document to digits', async () => {
      const body = customerBody(
        await http()
          .post('/customers')
          .send({ ...validPf, document: '111.444.777-35' })
          .expect(201),
      );

      expect(body.document).toBe('11144477735');
    });

    it('rejects a PF without name (invariant)', async () => {
      const pfWithoutName = {
        personType: validPf.personType,
        document: validPf.document,
        email: validPf.email,
        phone: validPf.phone,
        address: validPf.address,
      };
      await http().post('/customers').send(pfWithoutName).expect(400);
    });

    it('rejects a PF with corporateName (invariant)', async () => {
      await http()
        .post('/customers')
        .send({ ...validPf, corporateName: 'Should not exist' })
        .expect(400);
    });

    it('rejects invalid payloads', async () => {
      await http()
        .post('/customers')
        .send({ ...validPf, email: 'not-an-email' })
        .expect(400);
      await http()
        .post('/customers')
        .send({ ...validPf, address: { ...validPf.address, zipCode: '123' } })
        .expect(400);
      await http()
        .post('/customers')
        .send({ ...validPf, personType: 'XX' })
        .expect(400);
    });

    it('rejects unknown fields (strict schema)', async () => {
      await http()
        .post('/customers')
        .send({ ...validPf, foo: 'bar' })
        .expect(400);
    });

    it('returns 409 for a duplicated active document', async () => {
      await http().post('/customers').send(validPf).expect(201);
      await http()
        .post('/customers')
        .send({ ...validPf, name: 'Other Name', email: 'other@example.com' })
        .expect(409);
    });
  });

  describe('GET /customers/:id', () => {
    it('returns a customer by id', async () => {
      const created = customerBody(
        await http().post('/customers').send(validPf).expect(201),
      );

      const body = customerBody(
        await http().get(`/customers/${created.id}`).expect(200),
      );

      expect(body.id).toBe(created.id);
      expect(body.email).toBe(validPf.email);
    });

    it('returns 404 for an unknown id', async () => {
      await http()
        .get('/customers/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });

    it('returns 400 for a malformed uuid', async () => {
      await http().get('/customers/not-a-uuid').expect(400);
    });
  });

  describe('GET /customers', () => {
    it('lists customers with pagination metadata', async () => {
      await http().post('/customers').send(validPf).expect(201);
      await http().post('/customers').send(validPj).expect(201);

      const body = pageBody(await http().get('/customers').expect(200));

      expect(body.total).toBe(2);
      expect(body.data).toHaveLength(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
      expect(body.totalPages).toBe(1);
    });

    it('paginates results', async () => {
      for (let i = 1; i <= 3; i++) {
        await http()
          .post('/customers')
          .send({
            ...validPf,
            document: validCpf(`00000000${i}`),
            name: `Person ${i}`,
          })
          .expect(201);
      }

      const page1 = pageBody(
        await http().get('/customers?page=1&limit=2').expect(200),
      );
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(2);

      const page2 = pageBody(
        await http().get('/customers?page=2&limit=2').expect(200),
      );
      expect(page2.data).toHaveLength(1);
    });

    it('filters by personType', async () => {
      await http().post('/customers').send(validPf).expect(201);
      await http().post('/customers').send(validPj).expect(201);

      const body = pageBody(
        await http().get('/customers?personType=CNPJ').expect(200),
      );

      expect(body.total).toBe(1);
      expect(body.data[0].document).toBe(validPj.document);
    });

    it('filters by name case-insensitively (partial match)', async () => {
      await http().post('/customers').send(validPf).expect(201);
      await http().post('/customers').send(validPj).expect(201);

      const body = pageBody(
        await http().get('/customers?name=john').expect(200),
      );

      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('John Doe');
    });
  });

  describe('PATCH /customers/:id', () => {
    it('updates only the sent fields and preserves the rest', async () => {
      const created = customerBody(
        await http().post('/customers').send(validPf).expect(201),
      );

      const body = customerBody(
        await http()
          .patch(`/customers/${created.id}`)
          .send({ email: 'new@example.com' })
          .expect(200),
      );

      expect(body.email).toBe('new@example.com');
      expect(body.name).toBe('John Doe');
      expect(body.phone).toEqual(created.phone);
      expect(body.address).toEqual(created.address);
    });

    it('returns 404 for an unknown id', async () => {
      await http()
        .patch('/customers/00000000-0000-4000-8000-000000000000')
        .send({ email: 'new@example.com' })
        .expect(404);
    });
  });

  describe('DELETE /customers/:id', () => {
    it('soft deletes and hides the customer', async () => {
      const created = customerBody(
        await http().post('/customers').send(validPf).expect(201),
      );

      await http().delete(`/customers/${created.id}`).expect(204);

      await http().get(`/customers/${created.id}`).expect(404);

      const list = pageBody(await http().get('/customers').expect(200));
      expect(list.total).toBe(0);
    });

    it('releases the document for re-registration (partial unique semantics)', async () => {
      const created = customerBody(
        await http().post('/customers').send(validPf).expect(201),
      );
      await http().delete(`/customers/${created.id}`).expect(204);

      const recreated = customerBody(
        await http().post('/customers').send(validPf).expect(201),
      );

      expect(recreated.id).not.toBe(created.id);
      expect(repository.customers.size).toBe(2); // deleted one remains stored
    });

    it('returns 404 for an unknown id', async () => {
      await http()
        .delete('/customers/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });
  });
});
