import { Cpf } from './cpf.value-object';
import { InvalidCpfException } from '../exceptions/mechanic.exceptions';

describe('Cpf', () => {
  it('accepts a valid CPF and stores the normalized digits', () => {
    const cpf = new Cpf('11144477735');

    expect(cpf.getValue()).toBe('11144477735');
  });

  it('normalizes formatted input to digits only', () => {
    const cpf = new Cpf('111.444.777-35');

    expect(cpf.getValue()).toBe('11144477735');
  });

  it('rejects a CPF with the wrong length', () => {
    expect(() => new Cpf('123')).toThrow(InvalidCpfException);
  });

  it('rejects a CPF with all identical digits', () => {
    expect(() => new Cpf('11111111111')).toThrow(InvalidCpfException);
  });

  it('rejects a CPF with an invalid check digit', () => {
    expect(() => new Cpf('11144477736')).toThrow(InvalidCpfException);
  });

  it('is equal to another Cpf with the same value', () => {
    const a = new Cpf('11144477735');
    const b = new Cpf('111.444.777-35');

    expect(a.equals(b)).toBe(true);
  });

  it('is not equal to another Cpf with a different value', () => {
    const a = new Cpf('11144477735');
    const b = new Cpf('52998224725');

    expect(a.equals(b)).toBe(false);
  });
});