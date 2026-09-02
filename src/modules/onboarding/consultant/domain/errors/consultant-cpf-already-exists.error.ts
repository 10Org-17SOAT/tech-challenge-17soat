export class ConsultantCpfAlreadyExistsError extends Error {
  constructor(cpf: string, options?: { cause?: unknown }) {
    super(`A consultant with CPF "${cpf}" already exists`, options);
    this.name = 'ConsultantCpfAlreadyExistsError';
  }
}
