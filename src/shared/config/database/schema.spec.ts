import { getTableConfig } from 'drizzle-orm/pg-core';
import { mechanicsTable } from '../../../modules/mechanic/infrastructure/persistence/mechanic.schema';
import { consultants } from '../../../modules/onboarding/consultant/infrastructure/persistence/schema';
import { customersTable } from '../../../modules/onboarding/customer/infrastructure/persistence/customer.schema';
import {
  stockKeepers,
  stockMovements,
  supplies,
} from '../../../modules/stock/infrastructure/persistence/schema';

describe('database schemas', () => {
  const expectProfileSchema = (
    table: Parameters<typeof getTableConfig>[0],
    uniqueIndexes: string[],
  ): void => {
    const config = getTableConfig(table);
    const indexNames = config.indexes.map((index) => index.config.name);
    const userIdColumn = config.columns.find(
      (column) => column.name === 'user_id',
    );

    expect(config.foreignKeys).toHaveLength(1);
    expect(config.foreignKeys[0].reference().columns).toHaveLength(1);
    expect(userIdColumn?.notNull).toBe(true);
    expect(indexNames).toEqual(expect.arrayContaining(uniqueIndexes));
  };

  it('keeps customer persistence constraints explicit', () => {
    expectProfileSchema(customersTable, [
      'customers_document_active_unique',
      'customers_user_active_unique',
    ]);
    expect(
      getTableConfig(customersTable)
        .columns.find((column) => column.name === 'updated_at')
        ?.onUpdateFn?.(),
    ).toBeInstanceOf(Date);
    expect(getTableConfig(customersTable).indexes).toHaveLength(5);
  });

  it('keeps mechanic persistence constraints and availability check explicit', () => {
    const config = getTableConfig(mechanicsTable);

    expectProfileSchema(mechanicsTable, [
      'mechanics_cpf_active_unique',
      'mechanics_user_active_unique',
    ]);
    expect(config.checks.map((check) => check.name)).toEqual([
      'mechanics_availability_valid',
    ]);
    expect(
      getTableConfig(mechanicsTable)
        .columns.find((column) => column.name === 'updated_at')
        ?.onUpdateFn?.(),
    ).toBeInstanceOf(Date);
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        'mechanics_availability_available_since_idx',
        'mechanics_deleted_at_idx',
        'mechanics_user_id_idx',
      ]),
    );
  });

  it('keeps consultant and stock keeper profile constraints equivalent', () => {
    expectProfileSchema(consultants, [
      'consultants_cpf_active_unique',
      'consultants_user_active_unique',
    ]);
    expectProfileSchema(stockKeepers, [
      'stock_keepers_cpf_active_unique',
      'stock_keepers_user_active_unique',
    ]);
  });

  it('keeps stock ledger constraints explicit', () => {
    const config = getTableConfig(stockMovements);

    expect(config.foreignKeys).toHaveLength(1);
    expect(config.foreignKeys[0].reference().columns).toHaveLength(1);
    expect(config.checks.map((check) => check.name)).toEqual([
      'stock_movements_quantity_positive',
      'stock_movements_type_valid',
      'stock_movements_in_requires_performer',
    ]);
    expect(
      getTableConfig(supplies).indexes.map((index) => index.config.name),
    ).toEqual(['supplies_name_active_unique']);
  });
});
