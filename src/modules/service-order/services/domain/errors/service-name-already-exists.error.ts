export class ServiceNameAlreadyExistsError extends Error {
  constructor(name: string, options?: { cause?: unknown }) {
    super(`A service named "${name}" already exists`, options);
    this.name = 'ServiceNameAlreadyExistsError';
  }
}
