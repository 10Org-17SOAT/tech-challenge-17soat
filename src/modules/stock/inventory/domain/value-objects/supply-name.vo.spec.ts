import { InvalidSupplyError } from '../errors/invalid-supply.error';
import { SupplyName } from './supply-name.vo';

describe('SupplyName', () => {
  it('trims the value', () => {
    expect(SupplyName.create('  Filtro  ').value).toBe('Filtro');
  });

  it('rejects empty names', () => {
    expect(() => SupplyName.create('   ')).toThrow(InvalidSupplyError);
  });

  it('rejects names longer than 255 characters', () => {
    expect(() => SupplyName.create('a'.repeat(256))).toThrow(
      InvalidSupplyError,
    );
  });

  it('compares by value', () => {
    expect(
      SupplyName.create('Filtro').equals(SupplyName.create(' Filtro ')),
    ).toBe(true);
  });
});
