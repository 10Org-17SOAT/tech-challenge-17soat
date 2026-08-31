export class InvalidDiagnosisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDiagnosisError';
  }
}
