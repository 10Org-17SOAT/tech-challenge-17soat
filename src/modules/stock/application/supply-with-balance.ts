import type { Supply } from '../domain/supply.entity';

/**
 * Read model shared by the supply read paths: catalogue data plus the balance
 * derived from the ledger. The balance is never a column on `supplies` — it is
 * recomputed from the movements on every read (GUIDELINES.md § Domain
 * criticality).
 */
export interface SupplyWithBalance {
  supply: Supply;
  availableBalance: number;
}
