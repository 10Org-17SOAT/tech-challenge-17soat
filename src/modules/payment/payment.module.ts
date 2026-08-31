import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/config/database/database.module';
import { QuotationsModule } from '../service-management/quotations/quotations.module';
import { GetPaymentUseCase } from './application/get-payment.usecase';
import { SettlePaymentUseCase } from './application/settle-payment.usecase';
import { PAYMENT_REPOSITORY } from './domain/payment.repository';
import { DrizzlePaymentRepository } from './infrastructure/persistence/drizzle-payment.repository';
import { PaymentsController } from './presentation/payments.controller';

@Module({
  // QuotationsModule exports only SERVICE_ORDER_BILLING_QUERY — its
  // repositories and use cases stay private, and only SettlePaymentUseCase
  // ever touches that contract. The reverse direction (service-orders
  // reacting to a payment) goes through `payment.received`, not an import.
  imports: [DatabaseModule, QuotationsModule],
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENT_REPOSITORY, useClass: DrizzlePaymentRepository },
    SettlePaymentUseCase,
    GetPaymentUseCase,
  ],
})
export class PaymentModule {}
