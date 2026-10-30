import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { ApprovalTokenExpiredError } from './errors/approval-token-expired.error';
import { ApprovalTokenNotIssuedError } from './errors/approval-token-not-issued.error';
import { InvalidApprovalTokenError } from './errors/invalid-approval-token.error';
import { InvalidQuotationError } from './errors/invalid-quotation.error';
import { QuotationAlreadyApprovedError } from './errors/quotation-already-approved.error';
import { QuotationAlreadyRejectedError } from './errors/quotation-already-rejected.error';

/**
 * How long the customer has to click the link in the email. A business rule of
 * the workshop, not a security knob: a quotation nobody answered in a week is
 * stale, and its prices were frozen at issue time.
 */
export const APPROVAL_TOKEN_TTL_DAYS = 7;

export const QUOTATION_STATUSES = ['issued', 'approved', 'rejected'] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/** What the customer can answer. Each one lands the quotation in that status. */
export const QUOTATION_DECISIONS = ['approved', 'rejected'] as const;

export type QuotationDecision = (typeof QUOTATION_DECISIONS)[number];

export const REJECTION_REASON_MAX_LENGTH = 500;

// A quotation line is either labour (a catalogue service) or a part (a stock
// supply pulled in by that service's bill of materials).
export const QUOTATION_ITEM_KINDS = ['labor', 'part'] as const;

export type QuotationItemKind = (typeof QUOTATION_ITEM_KINDS)[number];

/**
 * A `part` line reduced to what the stock ledger needs to reserve it: which
 * supply, and how many units. Prices and names stay behind in the quotation —
 * the ledger never had an opinion about money.
 */
export interface QuotationPartLine {
  readonly supplyId: string;
  readonly quantity: number;
}

export interface QuotationItemProps {
  id: string;
  kind: QuotationItemKind;
  // The catalogue row this line came from — kept for traceability only. Price
  // is never re-read through it: see `unitPriceInCents` below.
  referenceId: string;
  nameSnapshot: string;
  unitPriceInCents: number;
  quantity: number;
}

export interface CreateQuotationItemProps {
  kind: QuotationItemKind;
  referenceId: string;
  nameSnapshot: string;
  unitPriceInCents: number;
  quantity: number;
}

/**
 * A frozen line of a quotation. Name and unit price are copied at issue time,
 * never joined back to `services` or `supplies`: those are mutable catalogues,
 * and a quotation the customer approved must not change value afterwards.
 */
export class QuotationItem {
  private constructor(private readonly props: QuotationItemProps) {}

  static create(props: CreateQuotationItemProps): QuotationItem {
    return new QuotationItem({
      id: randomUUID(),
      kind: props.kind,
      referenceId: props.referenceId,
      nameSnapshot: QuotationItem.validateName(props.nameSnapshot),
      unitPriceInCents: QuotationItem.validateUnitPrice(props.unitPriceInCents),
      quantity: QuotationItem.validateQuantity(props.quantity),
    });
  }

  static restore(props: QuotationItemProps): QuotationItem {
    return new QuotationItem({ ...props });
  }

  get subtotalInCents(): number {
    return this.props.unitPriceInCents * this.props.quantity;
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new InvalidQuotationError('Quotation item name must not be empty');
    }
    return trimmed;
  }

  private static validateUnitPrice(unitPriceInCents: number): number {
    if (!Number.isInteger(unitPriceInCents) || unitPriceInCents < 0) {
      throw new InvalidQuotationError(
        'Quotation item unit price must be a non-negative integer amount of cents',
      );
    }
    return unitPriceInCents;
  }

  private static validateQuantity(quantity: number): number {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuotationError(
        'Quotation item quantity must be a positive integer',
      );
    }
    return quantity;
  }

  get id(): string {
    return this.props.id;
  }

  get kind(): QuotationItemKind {
    return this.props.kind;
  }

  get referenceId(): string {
    return this.props.referenceId;
  }

  get nameSnapshot(): string {
    return this.props.nameSnapshot;
  }

  get unitPriceInCents(): number {
    return this.props.unitPriceInCents;
  }

  get quantity(): number {
    return this.props.quantity;
  }
}

export interface QuotationProps {
  id: string;
  serviceOrderId: string;
  status: QuotationStatus;
  items: QuotationItem[];
  issuedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Only the digest is ever stored. The raw token exists once, returned by
  // `issueApprovalToken`, long enough to be written into the email.
  approvalTokenHash: string | null;
  approvalTokenExpiresAt: Date | null;
  approvalEmailSentAt: Date | null;
}

export interface IssueQuotationProps {
  serviceOrderId: string;
  items: CreateQuotationItemProps[];
}

export class Quotation {
  private constructor(private readonly props: QuotationProps) {}

  static issue(props: IssueQuotationProps): Quotation {
    if (props.items.length === 0) {
      throw new InvalidQuotationError(
        'A quotation must have at least one item',
      );
    }

    const now = new Date();
    return new Quotation({
      id: randomUUID(),
      serviceOrderId: props.serviceOrderId,
      status: 'issued',
      items: props.items.map((item) => QuotationItem.create(item)),
      issuedAt: now,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
      // A quotation is issued before anyone decides to email it. The link is
      // minted by whoever sends it, not by issuance.
      approvalTokenHash: null,
      approvalTokenExpiresAt: null,
      approvalEmailSentAt: null,
    });
  }

  static restore(props: QuotationProps): Quotation {
    return new Quotation({ ...props, items: [...props.items] });
  }

  approve(): void {
    this.assertUndecided();
    const now = new Date();
    this.props.status = 'approved';
    this.props.approvedAt = now;
    this.props.updatedAt = now;
  }

  /**
   * The customer turning the price down. Terminal for this quotation: the
   * order goes back to diagnosis and a new quotation is issued, so a rejected
   * one is never revived — it stays as the record of what was refused.
   */
  reject(reason?: string | null): void {
    this.assertUndecided();
    // Validated before anything changes, so a refused reason leaves the
    // quotation still open to an answer.
    const rejectionReason = Quotation.normalizeRejectionReason(reason ?? null);
    const now = new Date();
    this.props.status = 'rejected';
    this.props.rejectedAt = now;
    this.props.rejectionReason = rejectionReason;
    this.props.updatedAt = now;
  }

  /** Whether the customer already gave this exact answer. */
  isDecidedAs(decision: QuotationDecision): boolean {
    return decision === 'approved'
      ? this.props.status === 'approved'
      : this.props.status === 'rejected';
  }

  // A decision is final either way: approving twice, rejecting twice, or
  // changing one's mind all refuse here, so `approve()` and `reject()` share
  // one answer to "can this quotation still be decided".
  private assertUndecided(): void {
    if (this.props.status === 'approved') {
      throw new QuotationAlreadyApprovedError(this.props.id);
    }
    if (this.props.status === 'rejected') {
      throw new QuotationAlreadyRejectedError(this.props.id);
    }
  }

  private static normalizeRejectionReason(
    reason: string | null,
  ): string | null {
    if (reason === null) return null;
    const trimmed = reason.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > REJECTION_REASON_MAX_LENGTH) {
      throw new InvalidQuotationError(
        `Rejection reason must be at most ${REJECTION_REASON_MAX_LENGTH} characters`,
      );
    }
    return trimmed;
  }

  static hashApprovalToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Mints the link the customer clicks, and returns the raw token — the only
   * moment it exists outside the email. Calling it again rotates: the previous
   * link stops working, which is what "resend the quotation" has to mean when
   * the old value is unrecoverable from a hash.
   */
  issueApprovalToken(ttlDays: number = APPROVAL_TOKEN_TTL_DAYS): string {
    const rawToken = randomBytes(32).toString('base64url');
    const now = new Date();
    this.props.approvalTokenHash = Quotation.hashApprovalToken(rawToken);
    this.props.approvalTokenExpiresAt = new Date(
      now.getTime() + ttlDays * 24 * 60 * 60 * 1000,
    );
    this.props.updatedAt = now;
    return rawToken;
  }

  /**
   * Checks the token from the email against this quotation. Every reason to
   * refuse a link lives here, so the page that shows the quotation and the
   * endpoint that records the answer refuse the same links the same way.
   */
  verifyApprovalToken(rawToken: string): void {
    if (!this.props.approvalTokenHash || !this.props.approvalTokenExpiresAt) {
      throw new ApprovalTokenNotIssuedError(this.props.id);
    }

    const expected = Buffer.from(this.props.approvalTokenHash, 'hex');
    const actual = Buffer.from(Quotation.hashApprovalToken(rawToken), 'hex');
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new InvalidApprovalTokenError();
    }

    if (this.props.approvalTokenExpiresAt.getTime() <= Date.now()) {
      throw new ApprovalTokenExpiredError(this.props.approvalTokenExpiresAt);
    }
  }

  markApprovalEmailSent(): void {
    const now = new Date();
    this.props.approvalEmailSentAt = now;
    this.props.updatedAt = now;
  }

  // Always derived from the frozen lines — never a column the lines can drift from.
  get totalInCents(): number {
    return this.props.items.reduce(
      (total, item) => total + item.subtotalInCents,
      0,
    );
  }

  get id(): string {
    return this.props.id;
  }

  get serviceOrderId(): string {
    return this.props.serviceOrderId;
  }

  get status(): QuotationStatus {
    return this.props.status;
  }

  get items(): readonly QuotationItem[] {
    return this.props.items;
  }

  /**
   * The part lines of this quotation, for whoever has to move stock. Same
   * supply twice would mean the diagnosis listed two services sharing a part;
   * `IssueQuotationUseCase` already collapses those into one line, so this is
   * a straight projection and not another merge.
   */
  get partLines(): readonly QuotationPartLine[] {
    return this.props.items
      .filter((item) => item.kind === 'part')
      .map((item) => ({
        supplyId: item.referenceId,
        quantity: item.quantity,
      }));
  }

  get issuedAt(): Date {
    return this.props.issuedAt;
  }

  get approvedAt(): Date | null {
    return this.props.approvedAt;
  }

  get rejectedAt(): Date | null {
    return this.props.rejectedAt;
  }

  get rejectionReason(): string | null {
    return this.props.rejectionReason;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get approvalTokenHash(): string | null {
    return this.props.approvalTokenHash;
  }

  get approvalTokenExpiresAt(): Date | null {
    return this.props.approvalTokenExpiresAt;
  }

  get approvalEmailSentAt(): Date | null {
    return this.props.approvalEmailSentAt;
  }
}
