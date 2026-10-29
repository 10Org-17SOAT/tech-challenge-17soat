import { StockMovement } from './stock-movement.entity';

/** A supply with units still committed to a service order and not yet consumed. */
export interface OutstandingReservation {
  supplyId: string;
  quantity: number;
}

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<void>;
  /**
   * Persists a RESERVE movement only if the available balance still covers
   * it, atomically with respect to any other reservation racing the same
   * supply — throws InsufficientStockError otherwise, leaving no trace of the
   * rejected attempt. This is the one operation in the ledger that cannot be
   * a plain check-then-insert: two concurrent calls must never both succeed
   * when only one fits.
   */
  reserveIfAvailable(movement: StockMovement): Promise<void>;
  writeOffIfReserved(movement: StockMovement): Promise<void>;
  /** SUM(IN) - SUM(RESERVE): units that may still be reserved. */
  getAvailableBalance(supplyId: string): Promise<number>;
  /**
   * Same arithmetic as getAvailableBalance, resolved for many supplies at once
   * so a listing never fans out into one query per row. Every requested id is
   * present in the map — a supply with no movements maps to 0, never absent.
   */
  getAvailableBalances(supplyIds: string[]): Promise<Map<string, number>>;
  getReservedQuantity(
    supplyId: string,
    serviceOrderReference?: string,
  ): Promise<number>;
  /**
   * Everything still reserved for one service order, a row per supply, in no
   * particular order. Supplies whose reservations were already fully consumed
   * are absent rather than present with zero — the caller is asking what is
   * left to write off, and an empty array is the honest answer for an order
   * that has none.
   */
  findOutstandingReservations(
    serviceOrderReference: string,
  ): Promise<OutstandingReservation[]>;
}

export const STOCK_MOVEMENT_REPOSITORY = Symbol('STOCK_MOVEMENT_REPOSITORY');
