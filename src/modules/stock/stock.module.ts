import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module';
import { StockKeepersModule } from './stock-keepers/stock-keepers.module';

/**
 * The stock bounded context, as an aggregator over its submodules. It holds no
 * providers of its own: each submodule wires its own dependencies and publishes
 * its own contract — SUPPLY_CATALOG_QUERY from inventory, and
 * STOCK_KEEPER_DIRECTORY_QUERY from stock keepers.
 *
 * Other contexts import the submodule whose contract they need, not this one.
 */
@Module({
  imports: [InventoryModule, StockKeepersModule],
})
export class StockModule {}
