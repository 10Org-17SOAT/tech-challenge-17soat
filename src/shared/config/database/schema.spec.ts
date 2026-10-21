import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  roles,
  users,
} from '../../../modules/auth/infrastructure/persistence/schema';
import { mechanicAvailability } from '../../../modules/mechanic/infrastructure/persistence/mechanic.schema';
import {
  stockMovements,
  supplies,
} from '../../../modules/stock/infrastructure/persistence/schema';

describe('database schemas', () => {
  it('stores roles and profile identity in a single users table', () => {
    const usersConfig = getTableConfig(users);
    const indexNames = usersConfig.indexes.map((index) => index.config.name);

    expect(getTableConfig(roles).name).toBe('roles');
    expect(usersConfig.foreignKeys).toHaveLength(1);
    const documentIndex = usersConfig.indexes.find(
      (index) => index.config.name === 'users_document_active_unique',
    );
    expect(documentIndex?.config.unique).toBe(true);
    expect(documentIndex?.config.where).toBeDefined();
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'users_document_active_unique',
        'users_attributes_gin_idx',
      ]),
    );
    expect(
      usersConfig.columns
        .find((column) => column.name === 'updated_at')
        ?.onUpdateFn?.(),
    ).toBeInstanceOf(Date);
  });

  it('keeps mechanic allocation indexed and constrained separately', () => {
    const config = getTableConfig(mechanicAvailability);

    expect(config.foreignKeys).toHaveLength(1);
    expect(config.checks.map((check) => check.name)).toEqual([
      'mechanic_availability_valid',
    ]);
    expect(config.indexes.map((index) => index.config.name)).toContain(
      'mechanic_availability_fifo_idx',
    );
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
