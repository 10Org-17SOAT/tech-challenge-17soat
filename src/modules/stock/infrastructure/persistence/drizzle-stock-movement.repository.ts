import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { ExceedsReservedQuantityError } from '../../domain/errors/exceeds-reserved-quantity.error';
import { InsufficientStockError } from '../../domain/errors/insufficient-stock.error';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import {
  MovementType,
  StockMovement,
} from '../../domain/stock-movement.entity';
import type { StockMovementRepository } from '../../domain/stock-movement.repository';
import { stockMovements, supplies } from './schema';

type StockMovementRow = typeof stockMovements.$inferSelect;

@Injectable()
export class DrizzleStockMovementRepository implements StockMovementRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async save(movement: StockMovement): Promise<void> {
    const row: StockMovementRow = {
      id: movement.id,
      supplyId: movement.supplyId,
      type: movement.type,
      quantity: movement.quantity,
      serviceOrderReference: movement.serviceOrderReference,
      performedById: movement.performedById,
      performedByName: movement.performedByName,
      createdAt: movement.createdAt,
    };

    await this.db.insert(stockMovements).values(row);
  }

  // The only write in the ledger that needs a concurrency guarantee beyond
  // append-only: two reservations racing the same supply must never both fit
  // when only one can. A separate check-then-insert is a classic TOCTOU race
  // under load, so the transaction locks the *supply row* first — never a
  // stored balance, since that would reintroduce the drift the ledger exists
  // to avoid — which serializes every reservation attempt for that supply.
  // The balance is then read and the insert done inside the same lock.
  async reserveIfAvailable(movement: StockMovement): Promise<void> {
    await this.db.transaction(async (tx) => {
      const locked = await tx
        .select({ id: supplies.id })
        .from(supplies)
        .where(eq(supplies.id, movement.supplyId))
        .for('update');

      if (locked.length === 0) {
        throw new InsufficientStockError(
          movement.supplyId,
          movement.quantity,
          0,
        );
      }

      const [row] = await tx
        .select({
          total: sql<string>`coalesce(sum(
            case
              when ${stockMovements.type} = ${MovementType.In} then ${stockMovements.quantity}
              when ${stockMovements.type} = ${MovementType.Reserve} then -${stockMovements.quantity}
              else 0
            end
          ), 0)`,
        })
        .from(stockMovements)
        .where(eq(stockMovements.supplyId, movement.supplyId));

      const availableBalance = Number(row.total);
      if (availableBalance < movement.quantity) {
        throw new InsufficientStockError(
          movement.supplyId,
          movement.quantity,
          availableBalance,
        );
      }

      const insertRow: StockMovementRow = {
        id: movement.id,
        supplyId: movement.supplyId,
        type: movement.type,
        quantity: movement.quantity,
        serviceOrderReference: movement.serviceOrderReference,
        performedById: movement.performedById,
        performedByName: movement.performedByName,
        createdAt: movement.createdAt,
      };
      await tx.insert(stockMovements).values(insertRow);
    });
  }

  async writeOffIfReserved(movement: StockMovement): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .select({ id: supplies.id })
        .from(supplies)
        .where(eq(supplies.id, movement.supplyId))
        .for('update');

      const [row] = await tx
        .select({
          total: sql<string>`coalesce(sum(
            case
              when ${stockMovements.type} = ${MovementType.Reserve} then ${stockMovements.quantity}
              when ${stockMovements.type} = ${MovementType.Consume} then -${stockMovements.quantity}
              else 0
            end
          ), 0)`,
        })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.supplyId, movement.supplyId),
            eq(
              stockMovements.serviceOrderReference,
              movement.serviceOrderReference as string,
            ),
          ),
        );

      const reservedQuantity = Number(row.total);
      if (reservedQuantity === 0) {
        throw new ReservationNotFoundError(
          movement.supplyId,
          movement.serviceOrderReference as string,
        );
      }
      if (movement.quantity > reservedQuantity) {
        throw new ExceedsReservedQuantityError(
          movement.supplyId,
          movement.serviceOrderReference as string,
          movement.quantity,
          reservedQuantity,
        );
      }

      const insertRow: StockMovementRow = {
        id: movement.id,
        supplyId: movement.supplyId,
        type: movement.type,
        quantity: movement.quantity,
        serviceOrderReference: movement.serviceOrderReference,
        performedById: movement.performedById,
        performedByName: movement.performedByName,
        createdAt: movement.createdAt,
      };
      await tx.insert(stockMovements).values(insertRow);
    });
  }

  getAvailableBalance(supplyId: string): Promise<number> {
    return this.sumSignedBy(supplyId, MovementType.In, MovementType.Reserve);
  }

  // One GROUP BY for the whole page instead of a query per row. Postgres only
  // returns supplies that have movements, so the caller's ids are seeded to 0
  // first — the contract promises every requested id is present.
  async getAvailableBalances(
    supplyIds: string[],
  ): Promise<Map<string, number>> {
    const balances = new Map(supplyIds.map((supplyId) => [supplyId, 0]));
    if (supplyIds.length === 0) return balances;

    const rows = await this.db
      .select({
        supplyId: stockMovements.supplyId,
        total: sql<string>`coalesce(sum(
          case
            when ${stockMovements.type} = ${MovementType.In} then ${stockMovements.quantity}
            when ${stockMovements.type} = ${MovementType.Reserve} then -${stockMovements.quantity}
            else 0
          end
        ), 0)`,
      })
      .from(stockMovements)
      .where(inArray(stockMovements.supplyId, supplyIds))
      .groupBy(stockMovements.supplyId);

    for (const row of rows) {
      balances.set(row.supplyId, Number(row.total));
    }
    return balances;
  }

  getReservedQuantity(
    supplyId: string,
    serviceOrderReference?: string,
  ): Promise<number> {
    return this.sumSignedBy(
      supplyId,
      MovementType.Reserve,
      MovementType.Consume,
      serviceOrderReference,
    );
  }

  // Single aggregate query: adds `credit` movements, subtracts `debit` ones and
  // ignores the rest. COALESCE keeps a supply with no movements at 0 instead of
  // NULL.
  private async sumSignedBy(
    supplyId: string,
    credit: MovementType,
    debit: MovementType,
    serviceOrderReference?: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<string>`coalesce(sum(
          case
            when ${stockMovements.type} = ${credit} then ${stockMovements.quantity}
            when ${stockMovements.type} = ${debit} then -${stockMovements.quantity}
            else 0
          end
        ), 0)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.supplyId, supplyId),
          serviceOrderReference === undefined
            ? undefined
            : eq(stockMovements.serviceOrderReference, serviceOrderReference),
        ),
      );

    return Number(row.total);
  }
}
