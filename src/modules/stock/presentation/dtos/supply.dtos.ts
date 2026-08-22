import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Supply } from '../../domain/supply.entity';

export const createSupplySchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000).optional(),
  priceInCents: z.number().int().nonnegative(),
});

export class CreateSupplyDto extends createZodDto(createSupplySchema) {}

export const updateSupplySchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(2000).nullable(),
    priceInCents: z.number().int().nonnegative(),
  })
  .partial();

export class UpdateSupplyDto extends createZodDto(updateSupplySchema) {}

export const supplyIdParamSchema = z.object({
  id: z.uuid(),
});

export class SupplyIdParamDto extends createZodDto(supplyIdParamSchema) {}

export const supplyResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  priceInCents: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class SupplyResponseDto extends createZodDto(supplyResponseSchema) {}

export const listSuppliesQuerySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class ListSuppliesQueryDto extends createZodDto(
  listSuppliesQuerySchema,
) {}

export const paginatedSuppliesResponseSchema = z.object({
  items: z.array(supplyResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class PaginatedSuppliesResponseDto extends createZodDto(
  paginatedSuppliesResponseSchema,
) {}

export function toSupplyResponse(supply: Supply): SupplyResponseDto {
  return {
    id: supply.id,
    name: supply.name,
    description: supply.description,
    priceInCents: supply.priceInCents,
    createdAt: supply.createdAt.toISOString(),
    updatedAt: supply.updatedAt.toISOString(),
  };
}
