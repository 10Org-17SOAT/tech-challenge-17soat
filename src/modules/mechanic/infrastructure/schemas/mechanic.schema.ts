import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PhoneSchema = z
  .object({
    countryCode: z.string().trim().min(1, 'Country code is required'),
    areaCode: z.string().trim().optional(),
    number: z.string().trim().min(1, 'Phone number is required'),
  })
  .strict();

const SPECIALTIES = [
  'mechanical',
  'electrical',
  'bodywork',
  'painting',
  'tire',
  'glass',
  'upholstery',
  'air_conditioning',
  'inspection',
  'other',
] as const;

export const CreateMechanicSchema = z
  .object({
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
    availability: z
      .enum(['AVAILABLE', 'ALLOCATED', 'OFF_DUTY', 'INACTIVE'])
      .optional(),
  })
  .strict();

export class ListMechanicsQueryDto extends createZodDto(
  ListMechanicsQuerySchema,
) {}