import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { quotationResponseSchema } from '../../../quotations/presentation/dtos/quotation.dtos';
import { Diagnosis } from '../../domain/diagnosis.entity';

export const serviceOrderIdParamSchema = z.object({ serviceOrderId: z.uuid() });

export class ServiceOrderIdParamDto extends createZodDto(
  serviceOrderIdParamSchema,
) {}

export const completeDiagnosisSchema = z.object({
  findings: z.string().trim().min(1).max(4000),
  // The scope of work: catalogue services only. Parts are never listed here —
  // they come from each service's bill of materials when pricing happens.
  serviceItems: z
    .array(
      z.object({
        serviceId: z.uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export class CompleteDiagnosisDto extends createZodDto(
  completeDiagnosisSchema,
) {}

export const diagnosisResponseSchema = z.object({
  id: z.uuid(),
  serviceOrderId: z.uuid(),
  findings: z.string(),
  createdAt: z.iso.datetime(),
});

export class DiagnosisResponseDto extends createZodDto(
  diagnosisResponseSchema,
) {}

export const completeDiagnosisResponseSchema = z.object({
  diagnosis: diagnosisResponseSchema,
  quotation: quotationResponseSchema,
});

export class CompleteDiagnosisResponseDto extends createZodDto(
  completeDiagnosisResponseSchema,
) {}

export function toDiagnosisResponse(
  diagnosis: Diagnosis,
): DiagnosisResponseDto {
  return {
    id: diagnosis.id,
    serviceOrderId: diagnosis.serviceOrderId,
    findings: diagnosis.findings,
    createdAt: diagnosis.createdAt.toISOString(),
  };
}
