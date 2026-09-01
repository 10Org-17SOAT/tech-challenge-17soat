export class StockKeeperCpfAlreadyExistsError extends Error {
  constructor(cpf: string, options?: { cause?: unknown }) {
    super(`A stock keeper with CPF "${cpf}" already exists`, options);
    this.name = 'StockKeeperCpfAlreadyExistsError';
  }
}
