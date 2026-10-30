import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  Quotation,
  QUOTATION_DECISIONS,
  QUOTATION_ITEM_KINDS,
  QUOTATION_STATUSES,
  REJECTION_REASON_MAX_LENGTH,
} from '../../domain/quotation.entity';

// From the domain, like the schema's pgEnums: presentation never reaches into
// infrastructure, and both stay in step through the same constants.
const quotationStatusValues = QUOTATION_STATUSES;
const quotationItemKindValues = QUOTATION_ITEM_KINDS;

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
  rejectedAt: z.iso.datetime().nullable(),
  rejectionReason: z.string().nullable(),
  // Null on a quotation whose approval email never went out — sending is
  // best-effort and only logs on failure, so this is how the miss is noticed.
  approvalEmailSentAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class QuotationResponseDto extends createZodDto(
  quotationResponseSchema,
) {}

export const quotationDecisionSchema = z.object({
  token: z.string().min(1).describe('O token do link enviado por email'),
  decision: z.enum(QUOTATION_DECISIONS),
  reason: z
    .string()
    .max(REJECTION_REASON_MAX_LENGTH)
    .optional()
    .describe('Motivo da recusa. Ignorado na aprovação.'),
});

export class QuotationDecisionDto extends createZodDto(
  quotationDecisionSchema,
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
    rejectedAt: quotation.rejectedAt?.toISOString() ?? null,
    rejectionReason: quotation.rejectionReason,
    approvalEmailSentAt: quotation.approvalEmailSentAt?.toISOString() ?? null,
    createdAt: quotation.createdAt.toISOString(),
    updatedAt: quotation.updatedAt.toISOString(),
  };
}
