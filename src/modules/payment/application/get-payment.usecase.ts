import { Inject, Injectable } from '@nestjs/common';
import { PaymentNotFoundError } from '../domain/errors/payment-not-found.error';
import { Payment } from '../domain/payment.entity';
import { PAYMENT_REPOSITORY } from '../domain/payment.repository';
import type { PaymentRepository } from '../domain/payment.repository';

@Injectable()
export class GetPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new PaymentNotFoundError(paymentId);
    }
    return payment;
  }
}
