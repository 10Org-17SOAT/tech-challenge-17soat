import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SPECIALTIES } from '../../domain/value-objects/specialty.enum';
import {
  MECHANIC_AVAILABILITY,
  type MechanicAvailability,
} from '../../domain/value-objects/mechanic-availability.enum';

const AVAILABILITY_VALUES = Object.values(MECHANIC_AVAILABILITY) as [
  MechanicAvailability,
  ...MechanicAvailability[],
];

const PhoneSchema = z
  .object({
    countryCode: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, 'Country code must contain 1 to 3 digits'),
    areaCode: z
      .string()
      .trim()
      .regex(/^\d{2,3}$/, 'Area code must contain 2 to 3 digits')
      .nullable()
      .optional(),
    number: z
      .string()
      .trim()
      .regex(/^\d{7,15}$/, 'Phone number must contain 7 to 15 digits'),
  })
  .strict();

export const CreateMechanicSchema = z
  .object({
    userId: z.uuid(),
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(255, 'Name must be at most 255 characters'),
    cpf: z
      .string()
      .trim()
      .min(11, 'CPF must have 11 digits')
      .max(14, 'CPF must have at most 14 characters'),
    email: z.string().trim().email('Invalid email format'),
    phone: PhoneSchema,
    specialties: z
      .array(z.enum(SPECIALTIES))
      .min(1, 'At least one specialty is required'),
    hireDate: z.iso.datetime({ offset: true }),
  })
  .strict();

export class CreateMechanicDto extends createZodDto(CreateMechanicSchema) {}

export const UpdateMechanicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(255, 'Name must be at most 255 characters')
      .optional(),
    email: z.string().trim().email('Invalid email format').optional(),
    phone: PhoneSchema.optional(),
    specialties: z
      .array(z.enum(SPECIALTIES))
      .min(1, 'At least one specialty is required')
      .optional(),
    hireDate: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();

export class UpdateMechanicDto extends createZodDto(UpdateMechanicSchema) {}

export const ListMechanicsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    name: z.string().trim().optional(),
    specialty: z.enum(SPECIALTIES).optional(),
    availability: z.enum(AVAILABILITY_VALUES).optional(),
  })
  .strict();

export class ListMechanicsQueryDto extends createZodDto(
  ListMechanicsQuerySchema,
) {}

export const ClaimMechanicSchema = z
  .object({
    serviceOrderId: z.uuid('Service order id must be a valid UUID'),
    specialty: z.enum(SPECIALTIES).optional(),
  })
  .strict();

export class ClaimMechanicDto extends createZodDto(ClaimMechanicSchema) {}

export const ReleaseMechanicSchema = z
  .object({
    serviceOrderId: z.uuid('Service order id must be a valid UUID'),
  })
  .strict();

export class ReleaseMechanicDto extends createZodDto(ReleaseMechanicSchema) {}
