import { Cpf } from './cpf.vo';

class InvalidCpfError extends Error {}
const onInvalid = (raw: string) => new InvalidCpfError(`Invalid CPF: "${raw}"`);

describe('Cpf', () => {
  it('accepts a valid CPF and stores the normalized digits', () => {
    expect(Cpf.create('11144477735', onInvalid).value).toBe('11144477735');
  });

  it('normalizes formatted input to digits only', () => {
    expect(Cpf.create('111.444.777-35', onInvalid).value).toBe(
      '11144477735',
    );
  });

  it('rejects a CPF with the wrong length', () => {
    expect(() => Cpf.create('123', onInvalid)).toThrow(InvalidCpfError);
  });

  it('rejects a CPF with all identical digits', () => {
    expect(() => Cpf.create('11111111111', onInvalid)).toThrow(
      InvalidCpfError,
    );
  });

  it('rejects a CPF with an invalid check digit', () => {
    expect(() => Cpf.create('11144477736', onInvalid)).toThrow(
      InvalidCpfError,
    );
  });

  it('compares by normalized value', () => {
    expect(
      Cpf.create('11144477735', onInvalid).equals(
        Cpf.create('111.444.777-35', onInvalid),
      ),
    ).toBe(true);
    expect(
      Cpf.create('11144477735', onInvalid).equals(
        Cpf.create('52998224725', onInvalid),
      ),
    ).toBe(false);
  });
});
