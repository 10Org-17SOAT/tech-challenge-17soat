import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PhoneSchema = z
  .object({
    countryCode: z
      .string()
      .trim()
      .min(1, 'Country code is required'),
    areaCode: z
      .string()
      .trim()
      .optional(),
    number: z
      .string()
      .trim()
      .min(1, 'Phone number is required'),
  })
  .strict();

const AddressSchema = z
  .object({
    street: z
      .string()
      .trim()
      .min(1, 'Street is required'),
    number: z
      .string()
      .trim()
      .min(1, 'Number is required'),
    complement: z
      .string()
      .trim()
      .optional(),
    neighborhood: z
      .string()
      .trim()
      .min(1, 'Neighborhood is required'),
    city: z
      .string()
      .trim()
      .min(1, 'City is required'),
    state: z
      .string()
      .trim()
      .min(2, 'State is required')
      .max(2, 'State must be exactly 2 characters'),
    zipCode: z
      .string()
      .trim()
      .min(8, 'Zip code must be exactly 8 digits')
      .max(8, 'Zip code must be exactly 8 digits')
      .regex(/^\d{8}$/, 'Zip code must contain only digits'),
  })
  .strict();

export const CreateCustomerSchema = z
  .object({
    personType: z.enum(['CPF', 'CNPJ']),
    document: z
      .string()
      .trim()
      .min(1, 'Document is required'),
    name: z
      .string()
      .trim()
      .optional(),
    corporateName: z
      .string()
      .trim()
      .optional(),
    tradeName: z
      .string()
      .trim()
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email format'),
    phone: PhoneSchema,
    address: AddressSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.personType === 'CPF') {
      if (!data.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PF customer requires a name.',
          path: ['name'],
        });
      }
      if (data.corporateName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PF customer cannot have a corporateName.',
          path: ['corporateName'],
        });
      }
      if (data.tradeName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PF customer cannot have a tradeName.',
          path: ['tradeName'],
        });
      }
    }

    if (data.personType === 'CNPJ') {
      if (data.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PJ customer cannot have a name.',
          path: ['name'],
        });
      }
      if (!data.corporateName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PJ customer requires a corporateName.',
          path: ['corporateName'],
        });
      }
      if (!data.tradeName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PJ customer requires a tradeName.',
          path: ['tradeName'],
        });
      }
    }
  });

export class CreateCustomerDto extends createZodDto(
  CreateCustomerSchema,
) {}

export const UpdateCustomerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .optional(),
    corporateName: z
      .string()
      .trim()
      .optional(),
    tradeName: z
      .string()
      .trim()
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email format')
      .optional(),
    phone: PhoneSchema.optional(),
    address: AddressSchema.optional(),
  })
  .strict();

export class UpdateCustomerDto extends createZodDto(
  UpdateCustomerSchema,
) {}

export const ListCustomersQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .positive()
      .default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .default(10),
    personType: z
      .enum(['CPF', 'CNPJ'])
      .optional(),
    name: z
      .string()
      .trim()
      .optional(),
    document: z
      .string()
      .trim()
      .optional(),
    email: z
      .string()
      .trim()
      .optional(),
  })
  .strict();

export class ListCustomersQueryDto extends createZodDto(
  ListCustomersQuerySchema,
) {}
