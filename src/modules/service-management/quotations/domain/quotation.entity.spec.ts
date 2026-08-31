import { ApprovalTokenExpiredError } from './errors/approval-token-expired.error';
import { ApprovalTokenNotIssuedError } from './errors/approval-token-not-issued.error';
import { InvalidApprovalTokenError } from './errors/invalid-approval-token.error';
import { InvalidQuotationError } from './errors/invalid-quotation.error';
import { QuotationAlreadyApprovedError } from './errors/quotation-already-approved.error';
import { Quotation, QuotationItem } from './quotation.entity';

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

    it('approves when the token matches', () => {
      const quotation = issued();
      const rawToken = quotation.issueApprovalToken();

      quotation.approveWithToken(rawToken);

      expect(quotation.status).toBe('approved');
      expect(quotation.approvedAt).not.toBeNull();
    });

    it('refuses a token that does not match', () => {
      const quotation = issued();
      quotation.issueApprovalToken();

      expect(() => quotation.approveWithToken('nao-e-o-token')).toThrow(
        InvalidApprovalTokenError,
      );
      expect(quotation.status).toBe('issued');
    });

    it('refuses a link on a quotation that was never emailed', () => {
      expect(() => issued().approveWithToken('qualquer-coisa')).toThrow(
        ApprovalTokenNotIssuedError,
      );
    });

    // A negative TTL puts the expiry in the past without touching the clock.
    it('refuses a token past its expiry', () => {
      const quotation = issued();
      const rawToken = quotation.issueApprovalToken(-1);

      expect(() => quotation.approveWithToken(rawToken)).toThrow(
        ApprovalTokenExpiredError,
      );
      expect(quotation.status).toBe('issued');
    });

    // Resending has no choice: only the hash was kept, so the previous value
    // cannot be sent a second time.
    it('rotates on reissue, killing the previous link', () => {
      const quotation = issued();
      const firstToken = quotation.issueApprovalToken();

      const secondToken = quotation.issueApprovalToken();

      expect(secondToken).not.toBe(firstToken);
      expect(() => quotation.approveWithToken(firstToken)).toThrow(
        InvalidApprovalTokenError,
      );
      quotation.approveWithToken(secondToken);
      expect(quotation.status).toBe('approved');
    });

    it('refuses a second approval even with a valid token', () => {
      const quotation = issued();
      const rawToken = quotation.issueApprovalToken();
      quotation.approveWithToken(rawToken);

      expect(() => quotation.approveWithToken(rawToken)).toThrow(
        QuotationAlreadyApprovedError,
      );
    });

    it('records when the email actually went out', () => {
      const quotation = issued();

      quotation.markApprovalEmailSent();

      expect(quotation.approvalEmailSentAt).toBeInstanceOf(Date);
    });
  });
});
