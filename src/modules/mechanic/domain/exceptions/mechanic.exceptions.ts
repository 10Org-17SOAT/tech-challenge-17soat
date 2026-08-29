export class MechanicException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MechanicException';
  }
}

export class InvalidCpfException extends MechanicException {
  constructor(cpf: string) {
    super(
      `Invalid CPF: "${cpf}". Expected 11 digits with valid check digits.`,
    );
    this.name = 'InvalidCpfException';
  }
}