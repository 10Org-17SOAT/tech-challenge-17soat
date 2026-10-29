export class SupplyNameAlreadyExistsError extends Error {
  constructor(name: string, options?: { cause?: unknown }) {
    super(`A supply named "${name}" already exists`, options);
    this.name = 'SupplyNameAlreadyExistsError';
  }
}
