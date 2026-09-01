import { InvalidStockKeeperError } from '../errors/invalid-stock-keeper.error';
import { Cpf } from './cpf.vo';

describe('Cpf', () => {
  it('accepts a valid CPF and stores the normalized digits', () => {
    expect(Cpf.create('11144477735').value).toBe('11144477735');
  });

  it('normalizes formatted input to digits only', () => {
    expect(Cpf.create('111.444.777-35').value).toBe('11144477735');
  });

  it('rejects a CPF with the wrong length', () => {
    expect(() => Cpf.create('123')).toThrow(InvalidStockKeeperError);
  });

  it('rejects a CPF with all identical digits', () => {
    expect(() => Cpf.create('11111111111')).toThrow(InvalidStockKeeperError);
  });

  it('rejects a CPF with an invalid check digit', () => {
    expect(() => Cpf.create('11144477736')).toThrow(InvalidStockKeeperError);
  });

  it('compares by normalized value', () => {
    expect(Cpf.create('11144477735').equals(Cpf.create('111.444.777-35'))).toBe(
      true,
    );
    expect(Cpf.create('11144477735').equals(Cpf.create('52998224725'))).toBe(
      false,
    );
  });
});
