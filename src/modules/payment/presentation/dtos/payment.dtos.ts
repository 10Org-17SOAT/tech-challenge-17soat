import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Payment } from '../../domain/payment.entity';

export const settlePaymentSchema = z.object({
  serviceOrderId: z.uuid(),
});

export class SettlePaymentDto extends createZodDto(settlePaymentSchema) {}

export const paymentIdParamSchema = z.object({ id: z.uuid() });

export class PaymentIdParamDto extends createZodDto(paymentIdParamSchema) {}

export const paymentResponseSchema = z.object({
  id: z.uuid(),
  serviceOrderId: z.uuid(),
  amountInCents: z.number().int(),
  paidAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class PaymentResponseDto extends createZodDto(paymentResponseSchema) {}

export function toPaymentResponse(payment: Payment): PaymentResponseDto {
  return {
    id: payment.id,
    serviceOrderId: payment.serviceOrderReference,
    amountInCents: payment.amountInCents,
    paidAt: payment.paidAt.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
