export class SupplyNameAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`A supply named "${name}" already exists`);
    this.name = 'SupplyNameAlreadyExistsError';
  }
}
