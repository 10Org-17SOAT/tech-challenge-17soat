import { randomUUID } from 'node:crypto';
import { InvalidStockMovementError } from './errors/invalid-stock-movement.error';
import { Quantity } from './value-objects/quantity.vo';

export const MovementType = {
  In: 'IN',
  Reserve: 'RESERVE',
  Consume: 'CONSUME',
} as const;

export type MovementType = (typeof MovementType)[keyof typeof MovementType];

interface InternalProps {
  id: string;
  supplyId: string;
  type: MovementType;
  quantity: Quantity;
  serviceOrderReference: string | null;
  performedById: string | null;
  performedByName: string | null;
  createdAt: Date;
}

export interface Performer {
  id: string;
  name: string;
}

/**
 * One entry of the stock ledger. Quantity lives here and only here — supplies
 * hold catalogue data, never a running total: the balance must always be
 * derivable and auditable.
 */
export class StockMovement {
  private constructor(private readonly props: InternalProps) {}

  // An IN movement must always be attributable to the stock keeper who
  // registered it — RESERVE/CONSUME are triggered by the Service Order, not
  // by a person, so they carry no performer.
  static in(
    supplyId: string,
    quantity: number,
    performedBy: Performer,
  ): StockMovement {
    return StockMovement.open(
      MovementType.In,
      supplyId,
      quantity,
      null,
      performedBy,
    );
  }

  static reserve(
    supplyId: string,
    quantity: number,
    serviceOrderReference: string,
  ): StockMovement {
    return StockMovement.open(
      MovementType.Reserve,
      supplyId,
      quantity,
      serviceOrderReference,
      null,
    );
  }

  static consume(
    supplyId: string,
    quantity: number,
    serviceOrderReference: string,
  ): StockMovement {
    return StockMovement.open(
      MovementType.Consume,
      supplyId,
      quantity,
      serviceOrderReference,
      null,
    );
  }

  private static open(
    type: MovementType,
    supplyId: string,
    quantity: number,
    serviceOrderReference: string | null,
    performedBy: Performer | null,
  ): StockMovement {
    return new StockMovement({
      id: randomUUID(),
      supplyId,
      type,
      quantity: Quantity.create(quantity),
      serviceOrderReference: normalizeReference(type, serviceOrderReference),
      performedById: performedBy?.id ?? null,
      performedByName: performedBy?.name ?? null,
      createdAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get supplyId(): string {
    return this.props.supplyId;
  }

  get type(): MovementType {
    return this.props.type;
  }

  get quantity(): number {
    return this.props.quantity.units;
  }

  get serviceOrderReference(): string | null {
    return this.props.serviceOrderReference;
  }

  get performedById(): string | null {
    return this.props.performedById;
  }

  get performedByName(): string | null {
    return this.props.performedByName;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

// RESERVE and CONSUME only mean something against a service order; an untraceable
// reservation could never be released or audited.
function normalizeReference(
  type: MovementType,
  serviceOrderReference: string | null,
): string | null {
  if (type === MovementType.In) return null;

  const trimmed = serviceOrderReference?.trim() ?? '';
  if (trimmed.length === 0) {
    throw new InvalidStockMovementError(
      `A ${type} movement requires a service order reference`,
    );
  }
  return trimmed;
}
