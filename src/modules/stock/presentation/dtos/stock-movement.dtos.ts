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
