/** The link was valid but the quotation's approval window has closed. */
export class ApprovalTokenExpiredError extends Error {
  constructor(readonly expiredAt: Date) {
    super(`This approval link expired on ${expiredAt.toISOString()}`);
    this.name = 'ApprovalTokenExpiredError';
  }
}
