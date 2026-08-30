/** The token in the link does not match the one the quotation was emailed with. */
export class InvalidApprovalTokenError extends Error {
  constructor() {
    // Deliberately says nothing about which quotation, or whether one exists:
    // an approval link is handed out, and a wrong one gets no information back.
    super('Invalid approval token');
    this.name = 'InvalidApprovalTokenError';
  }
}
