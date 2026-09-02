import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { anamneses } from '../../../anamnesis/infrastructure/persistence/schema';
import type { AnamnesisCascadePort } from '../../domain/ports/anamnesis-cascade.port';

// Dedicated adapter for the ANAMNESIS_CASCADE_PORT: soft-deletes the anamnesis
// (if any) when its service order is soft-deleted.
@Injectable()
export class DrizzleAnamnesisCascadeAdapter implements AnamnesisCascadePort {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async softDeleteByServiceOrderId(serviceOrderId: string): Promise<void> {
    const now = new Date();
    await this.db
      .update(anamneses)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(anamneses.serviceOrderId, serviceOrderId),
          isNull(anamneses.deletedAt),
        ),
      );
  }
}