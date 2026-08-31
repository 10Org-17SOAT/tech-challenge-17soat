import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const customerIdParamSchema = z.object({
  id: z.uuid(),
});

export class CustomerIdParamDto extends createZodDto(customerIdParamSchema) {}

const phoneResponseSchema = z.object({
  countryCode: z.string(),
  areaCode: z.string().nullable(),
  number: z.string(),
});

const addressResponseSchema = z.object({
  street: z.string(),
  number: z.string(),
  complement: z.string().nullable(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
});

export const customerResponseSchema = z.object({
  id: z.uuid(),
  personType: z.enum(['CPF', 'CNPJ']),
  document: z.string(),
  name: z.string().nullable(),
  corporateName: z.string().nullable(),
  tradeName: z.string().nullable(),
  email: z.string(),
  phone: phoneResponseSchema,
  address: addressResponseSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CustomerResponseDto extends createZodDto(customerResponseSchema) {}

export const paginatedCustomersResponseSchema = z.object({
  data: z.array(customerResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

export class PaginatedCustomersResponseDto extends createZodDto(
  paginatedCustomersResponseSchema,
) {}
