import { Quotation } from '../domain/quotation.entity';
import type { QuotationRepository } from '../domain/quotation.repository';

export class InMemoryQuotationRepository implements QuotationRepository {
  readonly quotations = new Map<string, Quotation>();

  findById(id: string): Promise<Quotation | null> {
    return Promise.resolve(this.quotations.get(id) ?? null);
  }

  findByApprovalTokenHash(hash: string): Promise<Quotation | null> {
    for (const quotation of this.quotations.values()) {
      if (quotation.approvalTokenHash === hash) {
        return Promise.resolve(quotation);
      }
    }
    return Promise.resolve(null);
  }

  // The latest one, like the Drizzle repository: a rejected quotation is
  // superseded by the next one issued for the same order.
  findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null> {
    let latest: Quotation | null = null;
    for (const quotation of this.quotations.values()) {
      if (
        quotation.serviceOrderId === serviceOrderId &&
        (!latest || quotation.issuedAt >= latest.issuedAt)
      ) {
        latest = quotation;
      }
    }
    return Promise.resolve(latest);
  }

  save(quotation: Quotation): Promise<void> {
    this.quotations.set(quotation.id, quotation);
    return Promise.resolve();
  }
}
