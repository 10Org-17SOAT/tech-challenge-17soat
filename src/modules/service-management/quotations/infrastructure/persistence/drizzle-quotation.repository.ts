import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { Quotation, QuotationItem } from '../../domain/quotation.entity';
import type { QuotationRepository } from '../../domain/quotation.repository';
import { quotationItems, quotations } from './schema';

type QuotationRow = typeof quotations.$inferSelect;
type QuotationItemRow = typeof quotationItems.$inferSelect;

function toEntity(row: QuotationRow, itemRows: QuotationItemRow[]): Quotation {
  return Quotation.restore({
    ...row,
    items: itemRows.map((item) =>
      QuotationItem.restore({
        id: item.id,
        kind: item.kind,
        referenceId: item.referenceId,
        nameSnapshot: item.nameSnapshot,
        unitPriceInCents: item.unitPriceInCents,
        quantity: item.quantity,
      }),
    ),
  });
}

@Injectable()
export class DrizzleQuotationRepository implements QuotationRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<Quotation | null> {
    const rows = await this.db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id))
      .limit(1);
    return rows[0] ? this.withItems(rows[0]) : null;
  }

  async findByApprovalTokenHash(hash: string): Promise<Quotation | null> {
    const rows = await this.db
      .select()
      .from(quotations)
      .where(eq(quotations.approvalTokenHash, hash))
      .limit(1);
    return rows[0] ? this.withItems(rows[0]) : null;
  }

  async findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<Quotation | null> {
    const rows = await this.db
      .select()
      .from(quotations)
      .where(eq(quotations.serviceOrderId, serviceOrderId))
      .limit(1);
    return rows[0] ? this.withItems(rows[0]) : null;
  }

  // Lines are immutable once issued, so a save either inserts the whole
  // quotation or only touches the columns approval changes.
  async save(quotation: Quotation): Promise<void> {
    const row: QuotationRow = {
      id: quotation.id,
      serviceOrderId: quotation.serviceOrderId,
      status: quotation.status,
      issuedAt: quotation.issuedAt,
      approvedAt: quotation.approvedAt,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
      approvalTokenHash: quotation.approvalTokenHash,
      approvalTokenExpiresAt: quotation.approvalTokenExpiresAt,
      approvalEmailSentAt: quotation.approvalEmailSentAt,
    };

    await this.db
      .insert(quotations)
      .values(row)
      .onConflictDoUpdate({
        target: quotations.id,
        set: {
          status: row.status,
          approvedAt: row.approvedAt,
          updatedAt: row.updatedAt,
          approvalTokenHash: row.approvalTokenHash,
          approvalTokenExpiresAt: row.approvalTokenExpiresAt,
          approvalEmailSentAt: row.approvalEmailSentAt,
        },
      });

    const existing = await this.db
      .select({ id: quotationItems.id })
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quotation.id))
      .limit(1);
    if (existing.length > 0) return;

    await this.db.insert(quotationItems).values(
      quotation.items.map((item) => ({
        id: item.id,
        quotationId: quotation.id,
        kind: item.kind,
        referenceId: item.referenceId,
        nameSnapshot: item.nameSnapshot,
        unitPriceInCents: item.unitPriceInCents,
        quantity: item.quantity,
      })),
    );
  }

  private async withItems(row: QuotationRow): Promise<Quotation> {
    const itemRows = await this.db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, row.id));
    return toEntity(row, itemRows);
  }
}
