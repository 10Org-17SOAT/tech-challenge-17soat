import { StockMovement } from './stock-movement.entity';

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<void>;
  /** SUM(IN) - SUM(RESERVE): units that may still be reserved. */
  getAvailableBalance(supplyId: string): Promise<number>;
  /** SUM(RESERVE) - SUM(CONSUME): units held for service orders, not yet taken. */
  getReservedQuantity(supplyId: string): Promise<number>;
}

export const STOCK_MOVEMENT_REPOSITORY = Symbol('STOCK_MOVEMENT_REPOSITORY');
