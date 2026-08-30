import { Quotation } from '../domain/quotation.entity';
import type { QuotationRepository } from '../domain/quotation.repository';

export class InMemoryQuotationRepository implements QuotationRepository {
  readonly quotations = new Map<string, Quotation>();

  findById(id: string): Promise<Quotation | null> {
    return Promise.resolve(this.quotations.get(id) ?? null);
  }

  findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null> {
    for (const quotation of this.quotations.values()) {
      if (quotation.serviceOrderId === serviceOrderId) {
        return Promise.resolve(quotation);
      }
    }
    return Promise.resolve(null);
  }

  save(quotation: Quotation): Promise<void> {
    this.quotations.set(quotation.id, quotation);
    return Promise.resolve();
  }
}
