import { randomUUID } from 'node:crypto';
import { InvalidQuotationError } from './errors/invalid-quotation.error';
import { QuotationAlreadyApprovedError } from './errors/quotation-already-approved.error';

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
}
