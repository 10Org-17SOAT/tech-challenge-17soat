import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { CreateServiceOrderOutput } from '../../application/create-service-order.usecase';
import { ServiceOrder } from '../../domain/service-order.entity';
import { serviceOrderStatusEnum } from '../../infrastructure/persistence/schema';

const serviceOrderStatusValues = serviceOrderStatusEnum.enumValues;

const isoDateTime = z.iso.datetime({ offset: true });

// A repeated id is a typo, not two lines: the quantity is where "two" goes.
const uniqueBy =
  <T>(key: (item: T) => string, message: string) =>
  (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(key(item))) {
        ctx.addIssue({ code: 'custom', message });
        return;
      }
      seen.add(key(item));
    }
  };

export const createServiceOrderSchema = z
  .object({
    vehicleId: z.uuid(),
    openedById: z.uuid(),
    services: z
      .array(
        z.object({
          serviceId: z.uuid(),
          quantity: z.number().int().positive(),
        }),
      )
      .superRefine(
        uniqueBy((item) => item.serviceId, 'Each service may appear only once'),
      )
      .default([]),
    parts: z
      .array(
        z.object({
          supplyId: z.uuid(),
          quantity: z.number().int().positive(),
        }),
      )
      .superRefine(
        uniqueBy((part) => part.supplyId, 'Each part may appear only once'),
      )
      .default([]),
    notes: z.string().trim().max(2000).optional(),
    vehicleMileageAtEntry: z.number().int().nonnegative().optional(),
    scheduledAt: isoDateTime.optional(),
  })
  .strict();

export class CreateServiceOrderDto extends createZodDto(
  createServiceOrderSchema,
) {}

export const updateServiceOrderSchema = z
  .object({
    notes: z.string().trim().max(2000).nullable(),
    vehicleMileageAtEntry: z.number().int().nonnegative().nullable(),
    scheduledAt: isoDateTime.nullable(),
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

const requestedServiceResponseSchema = z.object({
  serviceId: z.uuid(),
  quantity: z.number().int(),
});

const requestedPartResponseSchema = z.object({
  supplyId: z.uuid(),
  quantity: z.number().int(),
});

export const createdServiceOrderResponseSchema =
  serviceOrderResponseSchema.extend({
    requestedServices: z.array(requestedServiceResponseSchema),
    requestedParts: z.array(requestedPartResponseSchema),
  });

export class CreatedServiceOrderResponseDto extends createZodDto(
  createdServiceOrderResponseSchema,
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
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
  })
  .refine(
    (query) =>
      !query.from || !query.to || new Date(query.from) <= new Date(query.to),
    {
      message: '"from" must be earlier than or equal to "to"',
      path: ['from'],
    },
  );

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

export function toCreatedServiceOrderResponse({
  order,
  requestedItems,
}: CreateServiceOrderOutput): CreatedServiceOrderResponseDto {
  return {
    ...toServiceOrderResponse(order),
    requestedServices: requestedItems.services.map((item) => ({
      serviceId: item.serviceId,
      quantity: item.quantity,
    })),
    requestedParts: requestedItems.parts.map((part) => ({
      supplyId: part.supplyId,
      quantity: part.quantity,
    })),
  };
}
