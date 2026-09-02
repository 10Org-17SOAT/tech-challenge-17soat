export class InvalidConsultantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConsultantError';
  }
}
