/** Approval was attempted by link on a quotation that was never emailed. */
export class ApprovalTokenNotIssuedError extends Error {
  constructor(readonly quotationId: string) {
    super(`Quotation "${quotationId}" has no approval link issued`);
    this.name = 'ApprovalTokenNotIssuedError';
  }
}
