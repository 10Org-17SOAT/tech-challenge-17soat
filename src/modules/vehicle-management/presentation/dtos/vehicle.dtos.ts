import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const LICENSE_PLATE_REGEX = /^[A-Z]{3}-?[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export const CreateVehicleSchema = z
  .object({
    licensePlate: z
      .string()
      .trim()
      .toUpperCase()
      .regex(LICENSE_PLATE_REGEX, 'Invalid license plate format'),

    model: z.string().trim().min(1, 'Model is required'),

    year: z.number().int().min(1886, 'Invalid vehicle year'),

    manufacturer: z.string().trim().min(1, 'Manufacturer is required'),

    description: z.string().trim().optional(),

    color: z.string().trim().min(1, 'Color is required'),

    fuelType: z.string().trim().min(1, 'Fuel type is required'),

    odometer: z.number().nonnegative('Odometer cannot be negative'),
  })
  .strict();

export class CreateVehicleDto extends createZodDto(CreateVehicleSchema) {}

export const UpdateVehicleSchema = CreateVehicleSchema.omit({
  licensePlate: true,
})
  .partial()
  .strict();

export class UpdateVehicleDto extends createZodDto(UpdateVehicleSchema) {}

export const ListVehiclesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),

    limit: z.coerce.number().int().positive().max(100).default(10),
  })
  .strict();

export class ListVehiclesQueryDto extends createZodDto(
  ListVehiclesQuerySchema,
) {}
