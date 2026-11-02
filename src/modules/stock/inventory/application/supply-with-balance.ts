import type { Supply } from '../domain/supply.entity';

export interface SupplyWithBalance {
  supply: Supply;
  availableBalance: number;
}
