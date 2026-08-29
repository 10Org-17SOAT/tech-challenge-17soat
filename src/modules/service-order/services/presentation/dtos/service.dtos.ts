import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { serviceCategoryEnum } from '@/modules/service-order/services/infrastructure/persistence/schema';
import { Service } from '@/modules/service-order/services/domain/service.entity';

const serviceCategoryValues = serviceCategoryEnum.enumValues;

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000).optional(),
  category: z.enum(serviceCategoryValues),
  priceInCents: z.number().int().nonnegative(),
  estimatedDuration: z.number().int().positive().optional(),
  warrantyDays: z.number().int().positive().optional(),
});

export class CreateServiceDto extends createZodDto(createServiceSchema) {}

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(2000).nullable(),
    category: z.enum(serviceCategoryValues),
    priceInCents: z.number().int().nonnegative(),
    estimatedDuration: z.number().int().positive().nullable(),
    warrantyDays: z.number().int().positive().nullable(),
    active: z.boolean(),
  })
  .partial();

export class UpdateServiceDto extends createZodDto(updateServiceSchema) {}

export const serviceIdParamSchema = z.object({
  id: z.uuid(),
});

export class ServiceIdParamDto extends createZodDto(serviceIdParamSchema) {}

export const serviceResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.enum(serviceCategoryValues),
  priceInCents: z.number().int(),
  estimatedDuration: z.number().int().nullable(),
  warrantyDays: z.number().int().nullable(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class ServiceResponseDto extends createZodDto(serviceResponseSchema) {}

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class ListServicesQueryDto extends createZodDto(
  listServicesQuerySchema,
) {}

export const paginatedServicesResponseSchema = z.object({
  items: z.array(serviceResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class PaginatedServicesResponseDto extends createZodDto(
  paginatedServicesResponseSchema,
) {}

export function toServiceResponse(service: Service): ServiceResponseDto {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    priceInCents: service.priceInCents,
    estimatedDuration: service.estimatedDuration,
    warrantyDays: service.warrantyDays,
    active: service.active,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}
