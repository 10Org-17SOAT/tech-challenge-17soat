import { ServiceOrderAlreadyPaidError } from '../domain/errors/service-order-already-paid.error';
import { Payment } from '../domain/payment.entity';
import type { PaymentRepository } from '../domain/payment.repository';

export class InMemoryPaymentRepository implements PaymentRepository {
  readonly payments = new Map<string, Payment>();

  findById(id: string): Promise<Payment | null> {
    return Promise.resolve(this.payments.get(id) ?? null);
  }

  insert(payment: Payment): Promise<void> {
    for (const existing of this.payments.values()) {
      if (existing.serviceOrderReference === payment.serviceOrderReference) {
        throw new ServiceOrderAlreadyPaidError(payment.serviceOrderReference);
      }
    }
    this.payments.set(payment.id, payment);
    return Promise.resolve();
  }
}
