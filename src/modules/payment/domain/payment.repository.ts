import { Payment } from './payment.entity';

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  /**
   * Inserts, or throws `ServiceOrderAlreadyPaidError` if the order already has
   * a payment. The check is the unique constraint's, not a prior read: a
   * read-then-write here would be the same TOCTOU race the stock ledger's
   * `reserveIfAvailable` exists to avoid.
   */
  insert(payment: Payment): Promise<void>;
}

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
