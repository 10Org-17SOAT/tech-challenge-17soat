import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { Diagnosis } from '../../domain/diagnosis.entity';
import type { DiagnosisRepository } from '../../domain/diagnosis.repository';
import { diagnostics } from './schema';

type DiagnosisRow = typeof diagnostics.$inferSelect;

function toEntity(row: DiagnosisRow): Diagnosis {
  return Diagnosis.restore(row);
}

@Injectable()
export class DrizzleDiagnosisRepository implements DiagnosisRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<Diagnosis | null> {
    const rows = await this.db
      .select()
      .from(diagnostics)
      .where(eq(diagnostics.serviceOrderId, serviceOrderId))
      .orderBy(desc(diagnostics.createdAt))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(diagnosis: Diagnosis): Promise<void> {
    await this.db.insert(diagnostics).values({
      id: diagnosis.id,
      serviceOrderId: diagnosis.serviceOrderId,
      findings: diagnosis.findings,
      createdAt: diagnosis.createdAt,
    });
  }
}
