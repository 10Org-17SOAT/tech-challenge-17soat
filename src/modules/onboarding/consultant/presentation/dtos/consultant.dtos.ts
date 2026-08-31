import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { Consultant } from '../../domain/consultant.entity';

export const createConsultantSchema = z.object({
  name: z.string().trim().min(1).max(255),
  cpf: z.string().trim().min(11).max(14),
  phone: z.string().trim().min(10).max(15),
});

export class CreateConsultantDto extends createZodDto(createConsultantSchema) {}

export const updateConsultantSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    phone: z.string().trim().min(10).max(15),
  })
  .partial();

export class UpdateConsultantDto extends createZodDto(updateConsultantSchema) {}

export const consultantIdParamSchema = z.object({
  id: z.uuid(),
});

export class ConsultantIdParamDto extends createZodDto(
  consultantIdParamSchema,
) {}

export const consultantResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  cpf: z.string(),
  phone: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class ConsultantResponseDto extends createZodDto(
  consultantResponseSchema,
) {}

export const listConsultantsQuerySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class ListConsultantsQueryDto extends createZodDto(
  listConsultantsQuerySchema,
) {}

export const paginatedConsultantsResponseSchema = z.object({
  items: z.array(consultantResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class PaginatedConsultantsResponseDto extends createZodDto(
  paginatedConsultantsResponseSchema,
) {}

export function toConsultantResponse(
  consultant: Consultant,
): ConsultantResponseDto {
  return {
    id: consultant.id,
    name: consultant.name,
    cpf: consultant.cpf,
    phone: consultant.phone,
    createdAt: consultant.createdAt.toISOString(),
    updatedAt: consultant.updatedAt.toISOString(),
  };
}
