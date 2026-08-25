import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import {
  MovementType,
  StockMovement,
} from '../../domain/stock-movement.entity';
import type { StockMovementRepository } from '../../domain/stock-movement.repository';
import { stockMovements } from './schema';

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
      createdAt: movement.createdAt,
    };

    await this.db.insert(stockMovements).values(row);
  }

  getAvailableBalance(supplyId: string): Promise<number> {
    return this.sumSignedBy(supplyId, MovementType.In, MovementType.Reserve);
  }

  getReservedQuantity(supplyId: string): Promise<number> {
    return this.sumSignedBy(
      supplyId,
      MovementType.Reserve,
      MovementType.Consume,
    );
  }

  // Single aggregate query: adds `credit` movements, subtracts `debit` ones and
  // ignores the rest. COALESCE keeps a supply with no movements at 0 instead of
  // NULL.
  private async sumSignedBy(
    supplyId: string,
    credit: MovementType,
    debit: MovementType,
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
      .where(eq(stockMovements.supplyId, supplyId));

    return Number(row.total);
  }
}
