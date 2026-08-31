import { Quotation } from './quotation.entity';

export interface QuotationRepository {
  findById(id: string): Promise<Quotation | null>;
  // Looked up by digest, never by raw token: the column holds the hash, so the
  // caller hashes first and the raw value never reaches a query.
  findByApprovalTokenHash(hash: string): Promise<Quotation | null>;
  findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null>;
  save(quotation: Quotation): Promise<void>;
}

export const QUOTATION_REPOSITORY = Symbol('QUOTATION_REPOSITORY');
