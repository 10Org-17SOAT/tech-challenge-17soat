import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { anamneses } from '../../../anamnesis/infrastructure/persistence/schema';
import type { AnamnesisExistencePort } from '../../domain/ports/anamnesis-existence.port';

// Dedicated adapter for the ANAMNESIS_EXISTENCE_PORT: service-orders reads
// anamnesis existence directly from the anamneses table (soft-deleted rows do
// not count) without depending on the anamnesis module internals.
@Injectable()
export class DrizzleAnamnesisExistenceAdapter
  implements AnamnesisExistencePort
{
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async existsByServiceOrderId(serviceOrderId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: anamneses.id })
      .from(anamneses)
      .where(
        and(
          eq(anamneses.serviceOrderId, serviceOrderId),
          isNull(anamneses.deletedAt),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}