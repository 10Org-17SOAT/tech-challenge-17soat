import { ApprovalTokenExpiredError } from './errors/approval-token-expired.error';
import { ApprovalTokenNotIssuedError } from './errors/approval-token-not-issued.error';
import { InvalidApprovalTokenError } from './errors/invalid-approval-token.error';
import { InvalidQuotationError } from './errors/invalid-quotation.error';
import { QuotationAlreadyApprovedError } from './errors/quotation-already-approved.error';
import { QuotationAlreadyRejectedError } from './errors/quotation-already-rejected.error';
import {
  Quotation,
  QuotationItem,
  REJECTION_REASON_MAX_LENGTH,
} from './quotation.entity';

const serviceOrderId = '11111111-1111-1111-1111-111111111111';

const laborItem = {
  kind: 'labor' as const,
  referenceId: '22222222-2222-2222-2222-222222222222',
  nameSnapshot: 'Troca de oleo',
  unitPriceInCents: 9990,
  quantity: 1,
};

const partItem = {
  kind: 'part' as const,
  referenceId: '33333333-3333-3333-3333-333333333333',
  nameSnapshot: 'Oleo 5W30',
  unitPriceInCents: 4500,
  quantity: 4,
};

describe('Quotation', () => {
  it('issues in status issued, with no approval timestamp', () => {
    const quotation = Quotation.issue({
      serviceOrderId,
      items: [laborItem],
    });

    expect(quotation.status).toBe('issued');
    expect(quotation.approvedAt).toBeNull();
    expect(quotation.serviceOrderId).toBe(serviceOrderId);
    expect(quotation.items).toHaveLength(1);
  });

  it('refuses to issue with no items', () => {
    expect(() => Quotation.issue({ serviceOrderId, items: [] })).toThrow(
      InvalidQuotationError,
    );
  });

  it('totals labour and parts by unit price times quantity', () => {
    const quotation = Quotation.issue({
      serviceOrderId,
      items: [laborItem, partItem],
    });

    expect(quotation.totalInCents).toBe(9990 + 4500 * 4);
  });

  it('approves once, stamping the timestamp', () => {
    const quotation = Quotation.issue({ serviceOrderId, items: [laborItem] });

    quotation.approve();

    expect(quotation.status).toBe('approved');
    expect(quotation.approvedAt).toBeInstanceOf(Date);
  });

  it('refuses a second approval', () => {
    const quotation = Quotation.issue({ serviceOrderId, items: [laborItem] });
    quotation.approve();

    expect(() => quotation.approve()).toThrow(QuotationAlreadyApprovedError);
  });

  describe('rejection', () => {
    const issued = () =>
      Quotation.issue({ serviceOrderId, items: [laborItem] });

    it('starts with no rejection recorded', () => {
      const quotation = issued();

      expect(quotation.rejectedAt).toBeNull();
      expect(quotation.rejectionReason).toBeNull();
    });

    it('rejects once, stamping the timestamp and keeping the reason', () => {
      const quotation = issued();

      quotation.reject('  Muito caro  ');

      expect(quotation.status).toBe('rejected');
      expect(quotation.rejectedAt).toBeInstanceOf(Date);
      expect(quotation.rejectionReason).toBe('Muito caro');
      expect(quotation.approvedAt).toBeNull();
    });

    it('treats a blank or missing reason as no reason', () => {
      const blank = issued();
      blank.reject('   ');
      const missing = issued();
      missing.reject();

      expect(blank.rejectionReason).toBeNull();
      expect(missing.rejectionReason).toBeNull();
    });

    it('refuses a reason longer than the limit, leaving the quotation issued', () => {
      const quotation = issued();

      expect(() =>
        quotation.reject('x'.repeat(REJECTION_REASON_MAX_LENGTH + 1)),
      ).toThrow(InvalidQuotationError);
      expect(quotation.status).toBe('issued');
    });

    it('refuses a second rejection', () => {
      const quotation = issued();
      quotation.reject();

      expect(() => quotation.reject()).toThrow(QuotationAlreadyRejectedError);
    });

    // A decision is final either way: the customer cannot flip it.
    it('refuses to reject an approved quotation', () => {
      const quotation = issued();
      quotation.approve();

      expect(() => quotation.reject()).toThrow(QuotationAlreadyApprovedError);
      expect(quotation.status).toBe('approved');
    });

    it('knows which answer it was given, if any', () => {
      const open = issued();
      const approved = issued();
      approved.approve();
      const rejected = issued();
      rejected.reject();

      expect(open.isDecidedAs('approved')).toBe(false);
      expect(open.isDecidedAs('rejected')).toBe(false);
      expect(approved.isDecidedAs('approved')).toBe(true);
      expect(approved.isDecidedAs('rejected')).toBe(false);
      expect(rejected.isDecidedAs('rejected')).toBe(true);
      expect(rejected.isDecidedAs('approved')).toBe(false);
    });

    it('refuses to approve a rejected quotation', () => {
      const quotation = issued();
      quotation.reject();

      expect(() => quotation.approve()).toThrow(QuotationAlreadyRejectedError);
      expect(quotation.status).toBe('rejected');
    });
  });

  describe('items', () => {
    it('rejects an empty name, a negative price and a non-positive quantity', () => {
      expect(() =>
        QuotationItem.create({ ...laborItem, nameSnapshot: '   ' }),
      ).toThrow(InvalidQuotationError);
      expect(() =>
        QuotationItem.create({ ...laborItem, unitPriceInCents: -1 }),
      ).toThrow(InvalidQuotationError);
      expect(() => QuotationItem.create({ ...laborItem, quantity: 0 })).toThrow(
        InvalidQuotationError,
      );
    });

    it('accepts a zero unit price — a service can be free, a part cannot be negative', () => {
      const item = QuotationItem.create({
        ...laborItem,
        unitPriceInCents: 0,
      });

      expect(item.subtotalInCents).toBe(0);
    });
  });

  describe('approval token', () => {
    const issued = () =>
      Quotation.issue({ serviceOrderId, items: [laborItem] });

    it('is absent until the quotation is actually emailed', () => {
      const quotation = issued();

      expect(quotation.approvalTokenHash).toBeNull();
      expect(quotation.approvalTokenExpiresAt).toBeNull();
      expect(quotation.approvalEmailSentAt).toBeNull();
    });

    it('stores only a digest, never the value that went into the link', () => {
      const quotation = issued();

      const rawToken = quotation.issueApprovalToken();

      expect(rawToken).not.toHaveLength(0);
      expect(quotation.approvalTokenHash).toBe(
        Quotation.hashApprovalToken(rawToken),
      );
      expect(quotation.approvalTokenHash).not.toBe(rawToken);
    });

    it('accepts the token it was emailed with', () => {
      const quotation = issued();
      const rawToken = quotation.issueApprovalToken();

      expect(() => quotation.verifyApprovalToken(rawToken)).not.toThrow();
    });

    it('refuses a token that does not match', () => {
      const quotation = issued();
      quotation.issueApprovalToken();

      expect(() => quotation.verifyApprovalToken('nao-e-o-token')).toThrow(
        InvalidApprovalTokenError,
      );
    });

    it('refuses a link on a quotation that was never emailed', () => {
      expect(() => issued().verifyApprovalToken('qualquer-coisa')).toThrow(
        ApprovalTokenNotIssuedError,
      );
    });

    // A negative TTL puts the expiry in the past without touching the clock.
    it('refuses a token past its expiry', () => {
      const quotation = issued();
      const rawToken = quotation.issueApprovalToken(-1);

      expect(() => quotation.verifyApprovalToken(rawToken)).toThrow(
        ApprovalTokenExpiredError,
      );
    });

    // Resending has no choice: only the hash was kept, so the previous value
    // cannot be sent a second time.
    it('rotates on reissue, killing the previous link', () => {
      const quotation = issued();
      const firstToken = quotation.issueApprovalToken();

      const secondToken = quotation.issueApprovalToken();

      expect(secondToken).not.toBe(firstToken);
      expect(() => quotation.verifyApprovalToken(firstToken)).toThrow(
        InvalidApprovalTokenError,
      );
      expect(() => quotation.verifyApprovalToken(secondToken)).not.toThrow();
    });

    it('records when the email actually went out', () => {
      const quotation = issued();

      quotation.markApprovalEmailSent();

      expect(quotation.approvalEmailSentAt).toBeInstanceOf(Date);
    });
  });
});
