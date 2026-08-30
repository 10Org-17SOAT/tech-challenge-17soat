import { Quotation } from './quotation.entity';

export interface QuotationRepository {
  findById(id: string): Promise<Quotation | null>;
  findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null>;
  save(quotation: Quotation): Promise<void>;
}

export const QUOTATION_REPOSITORY = Symbol('QUOTATION_REPOSITORY');
