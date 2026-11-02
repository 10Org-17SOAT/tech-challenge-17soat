import { z } from 'zod';

export const CustomerAttributesSchema = z
  .object({
    personType: z.enum(['CPF', 'CNPJ']),
    corporateName: z.string().nullable().optional(),
    tradeName: z.string().nullable().optional(),
    address: z
      .object({
        street: z.string(),
        number: z.string(),
        complement: z.string().nullable(),
        neighborhood: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
      })
      .strict(),
  })
  .strict();
