import { sql } from 'drizzle-orm';
import { pgTable, uniqueIndex } from 'drizzle-orm/pg-core';
import { profileColumns } from '../../../../../shared/infrastructure/persistence/profile-columns';

// A consultant is a profile specialization of an authenticated user.
export const consultants = pgTable(
  'consultants',
  {
    ...profileColumns('consultant_id'),
  },
  (table) => [
    // CPF uniqueness applies only to active consultants (soft delete frees it)
    uniqueIndex('consultants_cpf_active_unique')
      .on(table.cpf)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex('consultants_user_active_unique')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
