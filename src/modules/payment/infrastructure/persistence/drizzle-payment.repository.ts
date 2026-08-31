import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { ServiceOrderAlreadyPaidError } from '../../domain/errors/service-order-already-paid.error';
import { Payment } from '../../domain/payment.entity';
import type { PaymentRepository } from '../../domain/payment.repository';
import { payments } from './schema';

const PG_UNIQUE_VIOLATION = '23505';

type PaymentRow = typeof payments.$inferSelect;

function toEntity(row: PaymentRow): Payment {
  return Payment.restore({
    id: row.id,
    serviceOrderReference: row.serviceOrderReference,
    amountInCents: row.amountInCents,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

@Injectable()
export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<Payment | null> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async insert(payment: Payment): Promise<void> {
    try {
      await this.db.insert(payments).values({
        id: payment.id,
        serviceOrderReference: payment.serviceOrderReference,
        amountInCents: payment.amountInCents,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceOrderAlreadyPaidError(payment.serviceOrderReference);
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    candidate.code === PG_UNIQUE_VIOLATION || isUniqueViolation(candidate.cause)
  );
}
