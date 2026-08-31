import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { StockMovement } from '../../domain/stock-movement.entity';

export const registerStockEntrySchema = z.object({
  quantity: z.number().int().positive(),
});

export class RegisterStockEntryDto extends createZodDto(
  registerStockEntrySchema,
) {}

export const stockEntryResponseSchema = z.object({
  movementId: z.uuid(),
  supplyId: z.uuid(),
  quantity: z.number().int(),
  availableBalance: z.number().int(),
  createdAt: z.iso.datetime(),
});

export class StockEntryResponseDto extends createZodDto(
  stockEntryResponseSchema,
) {}

export function toStockEntryResponse(
  movement: StockMovement,
  availableBalance: number,
): StockEntryResponseDto {
  return {
    movementId: movement.id,
    supplyId: movement.supplyId,
    quantity: movement.quantity,
    availableBalance,
    createdAt: movement.createdAt.toISOString(),
  };
}

export const reservePartSchema = z.object({
  quantity: z.number().int().positive(),
  serviceOrderReference: z.string().trim().min(1).max(255),
});

export class ReservePartDto extends createZodDto(reservePartSchema) {}

export const reservationResponseSchema = z.object({
  movementId: z.uuid(),
  supplyId: z.uuid(),
  quantity: z.number().int(),
  serviceOrderReference: z.string(),
  availableBalance: z.number().int(),
  reservedQuantity: z.number().int(),
  createdAt: z.iso.datetime(),
});

export class ReservationResponseDto extends createZodDto(
  reservationResponseSchema,
) {}

export function toReservationResponse(
  movement: StockMovement,
  availableBalance: number,
  reservedQuantity: number,
): ReservationResponseDto {
  return {
    movementId: movement.id,
    supplyId: movement.supplyId,
    quantity: movement.quantity,
    serviceOrderReference: movement.serviceOrderReference as string,
    availableBalance,
    reservedQuantity,
    createdAt: movement.createdAt.toISOString(),
  };
}

export const writeOffReservedPartSchema = z.object({
  quantity: z.number().int().positive(),
  serviceOrderReference: z.string().trim().min(1).max(255),
});

export class WriteOffReservedPartDto extends createZodDto(
  writeOffReservedPartSchema,
) {}

export const writeOffResponseSchema = z.object({
  movementId: z.uuid(),
  supplyId: z.uuid(),
  quantity: z.number().int(),
  serviceOrderReference: z.string(),
  reservedQuantity: z.number().int(),
  createdAt: z.iso.datetime(),
});

export class WriteOffResponseDto extends createZodDto(writeOffResponseSchema) {}

export function toWriteOffResponse(
  movement: StockMovement,
  reservedQuantity: number,
): WriteOffResponseDto {
  return {
    movementId: movement.id,
    supplyId: movement.supplyId,
    quantity: movement.quantity,
    serviceOrderReference: movement.serviceOrderReference as string,
    reservedQuantity,
    createdAt: movement.createdAt.toISOString(),
  };
}
