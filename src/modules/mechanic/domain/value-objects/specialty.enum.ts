/**
 * Professional specialty of a mechanic. Mirrors the Service Order service
 * categories by duplication (zero coupling between bounded contexts).
 */
export const SPECIALTIES = [
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

export type Specialty = (typeof SPECIALTIES)[number];