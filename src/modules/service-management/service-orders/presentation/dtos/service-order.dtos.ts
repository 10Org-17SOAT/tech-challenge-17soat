import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ServiceOrder } from '../../domain/service-order.entity';
import { serviceOrderStatusEnum } from '../../infrastructure/persistence/schema';

const serviceOrderStatusValues = serviceOrderStatusEnum.enumValues;

export const createServiceOrderSchema = z.object({
  vehicleId: z.uuid(),
  openedById: z.uuid(),
  notes: z.string().trim().max(2000).optional(),
  vehicleMileageAtEntry: z.number().int().nonnegative().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export class CreateServiceOrderDto extends createZodDto(
  createServiceOrderSchema,
) {}
export const updateServiceOrderSchema = z
  .object({
    notes: z.string().trim().max(2000).nullable(),
    vehicleMileageAtEntry: z.number().int().nonnegative().nullable(),
    scheduledAt: z.coerce.date().nullable(),
  })
  .partial();

export class UpdateServiceOrderDto extends createZodDto(
  updateServiceOrderSchema,
) {}

export const serviceOrderIdParamSchema = z.object({
  id: z.uuid(),
});

export class ServiceOrderIdParamDto extends createZodDto(
  serviceOrderIdParamSchema,
) {}

export const serviceOrderResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  openedById: z.uuid(),
  openedByName: z.string(),
  status: z.enum(serviceOrderStatusValues),
  approvedByCustomer: z.boolean(),
  notes: z.string().nullable(),
  vehicleMileageAtEntry: z.number().int().nullable(),
  scheduledAt: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  deliveredAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class ServiceOrderResponseDto extends createZodDto(
  serviceOrderResponseSchema,
) {}

export const serviceOrderStatusResponseSchema = z.object({
  status: z.enum(serviceOrderStatusValues),
});

export class ServiceOrderStatusResponseDto extends createZodDto(
  serviceOrderStatusResponseSchema,
) {}

export const listServiceOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(serviceOrderStatusValues).optional(),
});

export class ListServiceOrdersQueryDto extends createZodDto(
  listServiceOrdersQuerySchema,
) {}

export const paginatedServiceOrdersResponseSchema = z.object({
  items: z.array(serviceOrderResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class PaginatedServiceOrdersResponseDto extends createZodDto(
  paginatedServiceOrdersResponseSchema,
) {}

// The window is optional at both ends: no bound at all means "the whole
// history". Full ISO datetimes with an offset, so the caller owns the
// timezone question and the API never has to guess the shop's.
export const averageExecutionTimeQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: '"from" must be earlier than or equal to "to"',
    path: ['from'],
  });

export class AverageExecutionTimeQueryDto extends createZodDto(
  averageExecutionTimeQuerySchema,
) {}

export const averageExecutionTimeResponseSchema = z.object({
  averageExecutionTimeMinutes: z.number().int().nullable(),
  sampleSize: z.number().int(),
});

export class AverageExecutionTimeResponseDto extends createZodDto(
  averageExecutionTimeResponseSchema,
) {}

export function toServiceOrderResponse(
  order: ServiceOrder,
): ServiceOrderResponseDto {
  return {
    id: order.id,
    vehicleId: order.vehicleId,
    openedById: order.openedById,
    openedByName: order.openedByName,
    status: order.status,
    approvedByCustomer: order.approvedByCustomer,
    notes: order.notes,
    vehicleMileageAtEntry: order.vehicleMileageAtEntry,
    scheduledAt: order.scheduledAt ? order.scheduledAt.toISOString() : null,
    startedAt: order.startedAt ? order.startedAt.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
