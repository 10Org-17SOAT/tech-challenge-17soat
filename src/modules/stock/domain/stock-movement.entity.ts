import { randomUUID } from 'node:crypto';
import { InvalidStockMovementError } from '@/modules/stock/domain/errors/invalid-stock-movement.error';
import { Quantity } from '@/modules/stock/domain/value-objects/quantity.vo';

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
  createdAt: Date;
}

/**
 * One entry of the stock ledger. Quantity lives here and only here — supplies
 * hold catalogue data, never a running total: the balance must always be
 * derivable and auditable.
 */
export class StockMovement {
  private constructor(private readonly props: InternalProps) {}

  static in(supplyId: string, quantity: number): StockMovement {
    return StockMovement.open(MovementType.In, supplyId, quantity, null);
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
    );
  }

  private static open(
    type: MovementType,
    supplyId: string,
    quantity: number,
    serviceOrderReference: string | null,
  ): StockMovement {
    return new StockMovement({
      id: randomUUID(),
      supplyId,
      type,
      quantity: Quantity.create(quantity),
      serviceOrderReference: normalizeReference(type, serviceOrderReference),
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
