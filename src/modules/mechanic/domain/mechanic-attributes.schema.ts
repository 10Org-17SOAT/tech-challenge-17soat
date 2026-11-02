import { z } from 'zod';
import { SPECIALTIES } from './value-objects/specialty.enum';

export const MechanicAttributesSchema = z
  .object({
    specialties: z.array(z.enum(SPECIALTIES)).min(1),
    hireDate: z.coerce.date(),
  })
  .strict();
