import type { Supply } from '@/modules/stock/domain/supply.entity';

export interface SupplyWithBalance {
  supply: Supply;
  availableBalance: number;
}
