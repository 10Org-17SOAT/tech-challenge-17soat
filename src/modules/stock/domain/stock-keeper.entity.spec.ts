import { InvalidStockKeeperError } from './errors/invalid-stock-keeper.error';
import { StockKeeper } from './stock-keeper.entity';

describe('StockKeeper', () => {
  it('creates a stock keeper with generated UUID and timestamps', () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });

    expect(stockKeeper.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(stockKeeper.name).toBe('Maria Estoquista');
    expect(stockKeeper.cpf).toBe('52998224725');
    expect(stockKeeper.phone).toBe('11987654321');
    expect(stockKeeper.createdAt).toBeInstanceOf(Date);
    expect(stockKeeper.updatedAt).toBeInstanceOf(Date);
    expect(stockKeeper.deletedAt).toBeNull();
  });

  it('normalizes formatted CPF and phone', () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '529.982.247-25',
      phone: '(11) 98765-4321',
    });

    expect(stockKeeper.cpf).toBe('52998224725');
    expect(stockKeeper.phone).toBe('11987654321');
  });

  it('rejects an invalid CPF', () => {
    expect(() =>
      StockKeeper.create({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Maria Estoquista',
        cpf: '11111111111',
        phone: '11987654321',
      }),
    ).toThrow(InvalidStockKeeperError);
  });

  it('rejects an invalid phone', () => {
    expect(() =>
      StockKeeper.create({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Maria Estoquista',
        cpf: '52998224725',
        phone: '123',
      }),
    ).toThrow(InvalidStockKeeperError);
  });

  it('updates only the provided fields, keeping the CPF immutable', () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    const before = stockKeeper.updatedAt;

    stockKeeper.update({ name: 'Marcia Estoquista', phone: '11912345678' });

    expect(stockKeeper.name).toBe('Marcia Estoquista');
    expect(stockKeeper.phone).toBe('11912345678');
    expect(stockKeeper.cpf).toBe('52998224725');
    expect(stockKeeper.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(() => stockKeeper.update({ phone: '123' })).toThrow(
      InvalidStockKeeperError,
    );
  });

  it('rejects creation without a linked user account', () => {
    expect(() =>
      StockKeeper.create({
        userId: '',
        name: 'Maria Estoquista',
        cpf: '52998224725',
        phone: '11987654321',
      }),
    ).toThrow(InvalidStockKeeperError);
  });

  it('links a user account, stamping updatedAt', () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    const before = stockKeeper.updatedAt;

    stockKeeper.linkUser('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');

    expect(stockKeeper.userId).toBe('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    expect(stockKeeper.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it('soft deletes by stamping deletedAt', () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });

    stockKeeper.delete();

    expect(stockKeeper.deletedAt).toBeInstanceOf(Date);
  });
});
