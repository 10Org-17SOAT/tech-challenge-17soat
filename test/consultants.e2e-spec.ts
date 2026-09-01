import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { httpAs, tokenFor } from './fixtures';
import { UserRole } from './../src/modules/auth/roles/role.enum';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CONSULTANT_REPOSITORY } from '../src/modules/onboarding/consultant/domain/consultant.repository';
import { InMemoryConsultantRepository } from '../src/modules/onboarding/consultant/__test__/in-memory-consultant.repository';

/**
 * E2E suite running against the real AppModule wiring with the repository
 * swapped for an in-memory fake (no database required), mirroring
 * customers.e2e-spec.ts.
 */
describe('Consultants (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CONSULTANT_REPOSITORY)
      .useClass(InMemoryConsultantRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = tokenFor(app, UserRole.ADMIN);
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => httpAs(app, token);

  interface ConsultantResponse {
    id: string;
    name: string;
    cpf: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
  }

  interface PaginatedResponse {
    items: ConsultantResponse[];
    total: number;
    page: number;
    limit: number;
  }

  describe('POST /consultants', () => {
    it('creates a consultant', async () => {
      const res = await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Carlos Consultor',
          cpf: '529.982.247-25',
          phone: '(11) 98765-4321',
        })
        .expect(201);

      const body = res.body as ConsultantResponse;
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.name).toBe('Carlos Consultor');
      expect(body.cpf).toBe('52998224725');
      expect(body.phone).toBe('11987654321');
    });

    it('rejects a duplicate active CPF', async () => {
      await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Carlos Consultor',
          cpf: '52998224725',
          phone: '11987654321',
        })
        .expect(201);

      await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Outra Pessoa',
          cpf: '52998224725',
          phone: '11912345678',
        })
        .expect(409);
    });

    it('rejects an invalid payload', async () => {
      await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: '',
          cpf: '1',
          phone: '1',
        })
        .expect(400);
    });
  });

  describe('GET /consultants/:id', () => {
    it('returns an existing consultant', async () => {
      const created = await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Carlos Consultor',
          cpf: '52998224725',
          phone: '11987654321',
        })
        .expect(201);

      const res = await http()
        .get(`/consultants/${(created.body as ConsultantResponse).id}`)
        .expect(200);
      expect((res.body as ConsultantResponse).name).toBe('Carlos Consultor');
    });

    it('returns 404 for an unknown consultant', async () => {
      await http()
        .get('/consultants/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
    });
  });

  describe('GET /consultants', () => {
    it('paginates and filters by name', async () => {
      await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Carlos Consultor',
          cpf: '52998224725',
          phone: '11987654321',
        })
        .expect(201);
      await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Ana Consultora',
          cpf: '15350946056',
          phone: '11911112222',
        })
        .expect(201);

      const all = await http().get('/consultants').expect(200);
      expect((all.body as PaginatedResponse).total).toBe(2);

      const filtered = await http().get('/consultants?name=ana').expect(200);
      const filteredBody = filtered.body as PaginatedResponse;
      expect(filteredBody.total).toBe(1);
      expect(filteredBody.items[0].name).toBe('Ana Consultora');
    });
  });

  describe('PATCH /consultants/:id', () => {
    it('updates name and phone, keeping the CPF immutable', async () => {
      const created = await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Carlos Consultor',
          cpf: '52998224725',
          phone: '11987654321',
        })
        .expect(201);
      const id = (created.body as ConsultantResponse).id;

      const updated = await http()
        .patch(`/consultants/${id}`)
        .send({ name: 'Carlos Silva' })
        .expect(200);

      const body = updated.body as ConsultantResponse;
      expect(body.name).toBe('Carlos Silva');
      expect(body.cpf).toBe('52998224725');
    });

    it('returns 404 for an unknown consultant', async () => {
      await http()
        .patch('/consultants/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .send({ name: 'X' })
        .expect(404);
    });
  });

  describe('DELETE /consultants/:id', () => {
    it('soft deletes a consultant', async () => {
      const created = await http()
        .post('/consultants')
        .send({
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Carlos Consultor',
          cpf: '52998224725',
          phone: '11987654321',
        })
        .expect(201);
      const id = (created.body as ConsultantResponse).id;

      await http().delete(`/consultants/${id}`).expect(204);
      await http().get(`/consultants/${id}`).expect(404);
    });

    it('returns 404 for an unknown consultant', async () => {
      await http()
        .delete('/consultants/6f2c8e0a-0b0e-4f6e-9e1e-000000000000')
        .expect(404);
    });
  });
});
