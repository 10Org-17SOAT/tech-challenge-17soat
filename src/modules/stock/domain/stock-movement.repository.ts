import { StockMovement } from './stock-movement.entity';

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<void>;
  /** SUM(IN) - SUM(RESERVE): units that may still be reserved. */
  getAvailableBalance(supplyId: string): Promise<number>;
  /**
   * Same arithmetic as getAvailableBalance, resolved for many supplies at once
   * so a listing never fans out into one query per row. Every requested id is
   * present in the map — a supply with no movements maps to 0, never absent.
   */
  getAvailableBalances(supplyIds: string[]): Promise<Map<string, number>>;
  /** SUM(RESERVE) - SUM(CONSUME): units held for service orders, not yet taken. */
  getReservedQuantity(supplyId: string): Promise<number>;
}

export const STOCK_MOVEMENT_REPOSITORY = Symbol('STOCK_MOVEMENT_REPOSITORY');
