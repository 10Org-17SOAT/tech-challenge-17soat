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

/**
 * How long the customer has to click the link in the email. A business rule of
 * the workshop, not a security knob: a quotation nobody answered in a week is
 * stale, and its prices were frozen at issue time.
 */
export const APPROVAL_TOKEN_TTL_DAYS = 7;

export const QUOTATION_STATUSES = ['issued', 'approved'] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

// A quotation line is either labour (a catalogue service) or a part (a stock
// supply pulled in by that service's bill of materials).
export const QUOTATION_ITEM_KINDS = ['labor', 'part'] as const;

export type QuotationItemKind = (typeof QUOTATION_ITEM_KINDS)[number];

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
    if (this.props.status === 'approved') {
      throw new QuotationAlreadyApprovedError(this.props.id);
    }
    const now = new Date();
    this.props.status = 'approved';
    this.props.approvedAt = now;
    this.props.updatedAt = now;
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
   * The customer accepting from the email. Every reason to refuse lives here,
   * beside `approve()`'s own — one place answers "is this approval valid".
   */
  approveWithToken(rawToken: string): void {
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

    // Expiry is checked before `approve()` so an expired link on an unapproved
    // quotation reports the expiry, not a generic refusal.
    if (this.props.approvalTokenExpiresAt.getTime() <= Date.now()) {
      throw new ApprovalTokenExpiredError(this.props.approvalTokenExpiresAt);
    }

    this.approve();
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

  get issuedAt(): Date {
    return this.props.issuedAt;
  }

  get approvedAt(): Date | null {
    return this.props.approvedAt;
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
