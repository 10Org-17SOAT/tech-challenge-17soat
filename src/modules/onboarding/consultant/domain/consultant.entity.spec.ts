import { InvalidConsultantError } from './errors/invalid-consultant.error';
import { Consultant } from './consultant.entity';

describe('Consultant', () => {
  it('creates a consultant with generated UUID and timestamps', () => {
    const consultant = Consultant.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });

    expect(consultant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(consultant.name).toBe('Carlos Consultor');
    expect(consultant.cpf).toBe('52998224725');
    expect(consultant.phone).toBe('11987654321');
    expect(consultant.createdAt).toBeInstanceOf(Date);
    expect(consultant.updatedAt).toBeInstanceOf(Date);
    expect(consultant.deletedAt).toBeNull();
  });

  it('normalizes formatted CPF and phone', () => {
    const consultant = Consultant.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '529.982.247-25',
      phone: '(11) 98765-4321',
    });

    expect(consultant.cpf).toBe('52998224725');
    expect(consultant.phone).toBe('11987654321');
  });

  it('rejects an invalid CPF', () => {
    expect(() =>
      Consultant.create({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Carlos Consultor',
        cpf: '11111111111',
        phone: '11987654321',
      }),
    ).toThrow(InvalidConsultantError);
  });

  it('rejects an invalid phone', () => {
    expect(() =>
      Consultant.create({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Carlos Consultor',
        cpf: '52998224725',
        phone: '123',
      }),
    ).toThrow(InvalidConsultantError);
  });

  it('updates only the provided fields, keeping the CPF immutable', () => {
    const consultant = Consultant.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });
    const before = consultant.updatedAt;

    consultant.update({ phone: '11912345678' });

    expect(consultant.name).toBe('Carlos Consultor');
    expect(consultant.phone).toBe('11912345678');
    expect(consultant.cpf).toBe('52998224725');
    expect(consultant.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(() => consultant.update({ phone: '123' })).toThrow(
      InvalidConsultantError,
    );
  });

  it('rejects creation without a linked user account', () => {
    expect(() =>
      Consultant.create({
        userId: '',
        name: 'Carlos Consultor',
        cpf: '52998224725',
        phone: '11987654321',
      }),
    ).toThrow(InvalidConsultantError);
  });

  it('soft deletes by stamping deletedAt', () => {
    const consultant = Consultant.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Carlos Consultor',
      cpf: '52998224725',
      phone: '11987654321',
    });

    consultant.delete();

    expect(consultant.deletedAt).toBeInstanceOf(Date);
  });
});
