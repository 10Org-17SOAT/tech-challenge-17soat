import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Quotation } from '../../domain/quotation.entity';
import {
  quotationItemKindEnum,
  quotationStatusEnum,
} from '../../infrastructure/persistence/schema';

const quotationStatusValues = quotationStatusEnum.enumValues;
const quotationItemKindValues = quotationItemKindEnum.enumValues;

export const quotationIdParamSchema = z.object({ id: z.uuid() });

export class QuotationIdParamDto extends createZodDto(quotationIdParamSchema) {}

export const serviceOrderIdParamSchema = z.object({ serviceOrderId: z.uuid() });

export class ServiceOrderIdParamDto extends createZodDto(
  serviceOrderIdParamSchema,
) {}

export const quotationItemResponseSchema = z.object({
  id: z.uuid(),
  kind: z.enum(quotationItemKindValues),
  referenceId: z.uuid(),
  name: z.string(),
  unitPriceInCents: z.number().int(),
  quantity: z.number().int(),
  subtotalInCents: z.number().int(),
});

export const quotationResponseSchema = z.object({
  id: z.uuid(),
  serviceOrderId: z.uuid(),
  status: z.enum(quotationStatusValues),
  items: z.array(quotationItemResponseSchema),
  totalInCents: z.number().int(),
  issuedAt: z.iso.datetime(),
  approvedAt: z.iso.datetime().nullable(),
  // Null on a quotation whose approval email never went out — sending is
  // best-effort and only logs on failure, so this is how the miss is noticed.
  approvalEmailSentAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class QuotationResponseDto extends createZodDto(
  quotationResponseSchema,
) {}

export function toQuotationResponse(
  quotation: Quotation,
): QuotationResponseDto {
  return {
    id: quotation.id,
    serviceOrderId: quotation.serviceOrderId,
    status: quotation.status,
    items: quotation.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      referenceId: item.referenceId,
      name: item.nameSnapshot,
      unitPriceInCents: item.unitPriceInCents,
      quantity: item.quantity,
      subtotalInCents: item.subtotalInCents,
    })),
    totalInCents: quotation.totalInCents,
    issuedAt: quotation.issuedAt.toISOString(),
    approvedAt: quotation.approvedAt?.toISOString() ?? null,
    approvalEmailSentAt: quotation.approvalEmailSentAt?.toISOString() ?? null,
    createdAt: quotation.createdAt.toISOString(),
    updatedAt: quotation.updatedAt.toISOString(),
  };
}
