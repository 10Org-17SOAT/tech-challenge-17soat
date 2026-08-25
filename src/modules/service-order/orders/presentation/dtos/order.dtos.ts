import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Order } from '../../domain/order.entity';
import { orderStatusEnum } from '../../infrastructure/persistence/schema';

const orderStatusValues = orderStatusEnum.enumValues;

export const createOrderSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
  vehicleMileageAtEntry: z.number().int().nonnegative().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export class CreateOrderDto extends createZodDto(createOrderSchema) {}

export const updateOrderSchema = z
  .object({
    notes: z.string().trim().max(2000).nullable(),
    vehicleMileageAtEntry: z.number().int().nonnegative().nullable(),
    scheduledAt: z.coerce.date().nullable(),
  })
  .partial();

export class UpdateOrderDto extends createZodDto(updateOrderSchema) {}

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
});

export class UpdateOrderStatusDto extends createZodDto(
  updateOrderStatusSchema,
) {}

export const orderIdParamSchema = z.object({
  id: z.uuid(),
});

export class OrderIdParamDto extends createZodDto(orderIdParamSchema) {}

export const orderResponseSchema = z.object({
  id: z.uuid(),
  status: z.enum(orderStatusValues),
  approvedByCustomer: z.boolean(),
  notes: z.string().nullable(),
  vehicleMileageAtEntry: z.number().int().nullable(),
  scheduledAt: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class OrderResponseDto extends createZodDto(orderResponseSchema) {}

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(orderStatusValues).optional(),
});

export class ListOrdersQueryDto extends createZodDto(listOrdersQuerySchema) {}

export const paginatedOrdersResponseSchema = z.object({
  items: z.array(orderResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class PaginatedOrdersResponseDto extends createZodDto(
  paginatedOrdersResponseSchema,
) {}

export function toOrderResponse(order: Order): OrderResponseDto {
  return {
    id: order.id,
    status: order.status,
    approvedByCustomer: order.approvedByCustomer,
    notes: order.notes,
    vehicleMileageAtEntry: order.vehicleMileageAtEntry,
    scheduledAt: order.scheduledAt ? order.scheduledAt.toISOString() : null,
    startedAt: order.startedAt ? order.startedAt.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
