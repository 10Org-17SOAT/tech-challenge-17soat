import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  MECHANIC_AVAILABILITY,
  type MechanicAvailability,
} from '../../domain/value-objects/mechanic-availability.enum';

const AVAILABILITY_VALUES = Object.values(MECHANIC_AVAILABILITY) as [
  MechanicAvailability,
  ...MechanicAvailability[],
];

export const mechanicIdParamSchema = z.object({
  id: z.uuid(),
});

export class MechanicIdParamDto extends createZodDto(mechanicIdParamSchema) {}

const phoneResponseSchema = z.object({
  countryCode: z.string(),
  areaCode: z.string().nullable(),
  number: z.string(),
});

export const mechanicResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  cpf: z.string(),
  email: z.string(),
  phone: phoneResponseSchema,
  specialties: z.array(z.string()),
  hireDate: z.iso.datetime(),
  availability: z.enum(AVAILABILITY_VALUES),
  availableSince: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class MechanicResponseDto extends createZodDto(mechanicResponseSchema) {}

export const paginatedMechanicsResponseSchema = z.object({
  data: z.array(mechanicResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

export class PaginatedMechanicsResponseDto extends createZodDto(
  paginatedMechanicsResponseSchema,
) {}
