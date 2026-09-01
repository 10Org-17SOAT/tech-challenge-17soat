import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { Anamnesis } from '../../domain/anamnesis.entity';
import type { AnamnesisRepository } from '../../domain/anamnesis.repository';
import { anamneses } from './schema';

type AnamnesisRow = typeof anamneses.$inferSelect;

function toEntity(row: AnamnesisRow): Anamnesis {
  return Anamnesis.restore(row);
}

@Injectable()
export class DrizzleAnamnesisRepository implements AnamnesisRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<Anamnesis | null> {
    const rows = await this.db
      .select()
      .from(anamneses)
      .where(
        and(
          eq(anamneses.serviceOrderId, serviceOrderId),
          isNull(anamneses.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(anamnesis: Anamnesis): Promise<void> {
    const row: AnamnesisRow = {
      id: anamnesis.id,
      serviceOrderId: anamnesis.serviceOrderId,
      consultantId: anamnesis.consultantId,
      updatedBy: anamnesis.updatedBy,
      mainComplaint: anamnesis.mainComplaint,
      problemDescription: anamnesis.problemDescription,
      problemStartedAt: anamnesis.problemStartedAt,
      howStarted: anamnesis.howStarted,
      evolution: anamnesis.evolution,
      occurrenceConditions: anamnesis.occurrenceConditions,
      frequency: anamnesis.frequency,
      severity: anamnesis.severity,
      previousOccurrences: anamnesis.previousOccurrences,
      recentMaintenance: anamnesis.recentMaintenance,
      warningLights: anamnesis.warningLights,
      unusualNoisesSmells: anamnesis.unusualNoisesSmells,
      behaviorChanges: anamnesis.behaviorChanges,
      usageConditions: anamnesis.usageConditions,
      customerObservations: anamnesis.customerObservations,
      createdAt: anamnesis.createdAt,
      updatedAt: anamnesis.updatedAt,
      deletedAt: anamnesis.deletedAt,
    };

    await this.db
      .insert(anamneses)
      .values(row)
      .onConflictDoUpdate({ target: anamneses.id, set: row });
  }
}