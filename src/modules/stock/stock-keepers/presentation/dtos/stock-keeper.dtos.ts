import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { StockKeeper } from '../../domain/stock-keeper.entity';

export const createStockKeeperSchema = z.object({
  userId: z.uuid(),
  name: z.string().trim().min(1).max(255),
  cpf: z.string().trim().min(11).max(14),
  phone: z.string().trim().min(10).max(15),
});

export class CreateStockKeeperDto extends createZodDto(
  createStockKeeperSchema,
) {}

export const updateStockKeeperSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    phone: z.string().trim().min(10).max(15),
  })
  .partial();

export class UpdateStockKeeperDto extends createZodDto(
  updateStockKeeperSchema,
) {}

export const stockKeeperIdParamSchema = z.object({
  id: z.uuid(),
});

export class StockKeeperIdParamDto extends createZodDto(
  stockKeeperIdParamSchema,
) {}

export const stockKeeperResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  cpf: z.string(),
  phone: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class StockKeeperResponseDto extends createZodDto(
  stockKeeperResponseSchema,
) {}

export const listStockKeepersQuerySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class ListStockKeepersQueryDto extends createZodDto(
  listStockKeepersQuerySchema,
) {}

export const paginatedStockKeepersResponseSchema = z.object({
  items: z.array(stockKeeperResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class PaginatedStockKeepersResponseDto extends createZodDto(
  paginatedStockKeepersResponseSchema,
) {}

export function toStockKeeperResponse(
  stockKeeper: StockKeeper,
): StockKeeperResponseDto {
  return {
    id: stockKeeper.id,
    name: stockKeeper.name,
    cpf: stockKeeper.cpf,
    phone: stockKeeper.phone,
    createdAt: stockKeeper.createdAt.toISOString(),
    updatedAt: stockKeeper.updatedAt.toISOString(),
  };
}
