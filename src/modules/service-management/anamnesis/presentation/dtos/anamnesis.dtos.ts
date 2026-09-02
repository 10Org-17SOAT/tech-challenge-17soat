import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Anamnesis } from '../../domain/anamnesis.entity';
import {
  anamnesisFrequencyEnum,
  anamnesisHowStartedEnum,
  anamnesisSeverityEnum,
} from '../../infrastructure/persistence/schema';

const howStartedValues = anamnesisHowStartedEnum.enumValues;
const frequencyValues = anamnesisFrequencyEnum.enumValues;
const severityValues = anamnesisSeverityEnum.enumValues;

export const createAnamnesisSchema = z.object({
  vehicleId: z.uuid(),
  consultantId: z.uuid(),
  mainComplaint: z.string().trim().min(1).max(500),
  problemDescription: z.string().trim().min(1).max(4000),
  problemStartedAt: z.string().trim().max(2000).optional(),
  howStarted: z.enum(howStartedValues).optional(),
  evolution: z.string().trim().max(2000).optional(),
  occurrenceConditions: z.string().trim().max(2000).optional(),
  frequency: z.enum(frequencyValues).optional(),
  severity: z.enum(severityValues).optional(),
  previousOccurrences: z.string().trim().max(2000).optional(),
  recentMaintenance: z.string().trim().max(2000).optional(),
  warningLights: z.boolean().optional(),
  unusualNoisesSmells: z.string().trim().max(2000).optional(),
  behaviorChanges: z.string().trim().max(2000).optional(),
  usageConditions: z.string().trim().max(2000).optional(),
  customerObservations: z.string().trim().max(2000).optional(),
});

export class CreateAnamnesisDto extends createZodDto(createAnamnesisSchema) {}

// updatedBy is required on every update (AC-09: PATCH without it -> 400).
// The remaining fields are optional; nullable ones may be cleared.
export const updateAnamnesisSchema = z.object({
  updatedBy: z.uuid(),
  mainComplaint: z.string().trim().min(1).max(500).optional(),
  problemDescription: z.string().trim().min(1).max(4000).optional(),
  problemStartedAt: z.string().trim().max(2000).nullable().optional(),
  howStarted: z.enum(howStartedValues).nullable().optional(),
  evolution: z.string().trim().max(2000).nullable().optional(),
  occurrenceConditions: z.string().trim().max(2000).nullable().optional(),
  frequency: z.enum(frequencyValues).nullable().optional(),
  severity: z.enum(severityValues).nullable().optional(),
  previousOccurrences: z.string().trim().max(2000).nullable().optional(),
  recentMaintenance: z.string().trim().max(2000).nullable().optional(),
  warningLights: z.boolean().nullable().optional(),
  unusualNoisesSmells: z.string().trim().max(2000).nullable().optional(),
  behaviorChanges: z.string().trim().max(2000).nullable().optional(),
  usageConditions: z.string().trim().max(2000).nullable().optional(),
  customerObservations: z.string().trim().max(2000).nullable().optional(),
});

export class UpdateAnamnesisDto extends createZodDto(updateAnamnesisSchema) {}

export const serviceOrderIdParamSchema = z.object({
  serviceOrderId: z.uuid(),
});

export class ServiceOrderIdParamDto extends createZodDto(
  serviceOrderIdParamSchema,
) {}

export const anamnesisResponseSchema = z.object({
  id: z.uuid(),
  serviceOrderId: z.uuid(),
  vehicleId: z.uuid(),
  consultantId: z.uuid(),
  updatedBy: z.uuid().nullable(),
  mainComplaint: z.string(),
  problemDescription: z.string(),
  problemStartedAt: z.string().nullable(),
  howStarted: z.enum(howStartedValues).nullable(),
  evolution: z.string().nullable(),
  occurrenceConditions: z.string().nullable(),
  frequency: z.enum(frequencyValues).nullable(),
  severity: z.enum(severityValues).nullable(),
  previousOccurrences: z.string().nullable(),
  recentMaintenance: z.string().nullable(),
  warningLights: z.boolean().nullable(),
  unusualNoisesSmells: z.string().nullable(),
  behaviorChanges: z.string().nullable(),
  usageConditions: z.string().nullable(),
  customerObservations: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class AnamnesisResponseDto extends createZodDto(
  anamnesisResponseSchema,
) {}

export function toAnamnesisResponse(
  anamnesis: Anamnesis,
  vehicleId: string,
): AnamnesisResponseDto {
  return {
    id: anamnesis.id,
    serviceOrderId: anamnesis.serviceOrderId,
    vehicleId,
    consultantId: anamnesis.consultantId,
    updatedBy: anamnesis.updatedBy,
    mainComplaint: anamnesis.mainComplaint,
    problemDescription: anamnesis.problemDescription,
    problemStartedAt: anamnesis.problemStartedAt,
    howStarted: anamnesis.howStarted,
    evolution: anamnesis.evolution,
    occurrenceConditions: anamnesis.occurrenceConditions,
    frequency: anamnesis.frequency,
    severity: anamnesis.severity,
    previousOccurrences: anamnesis.previousOccurrences,
    recentMaintenance: anamnesis.recentMaintenance,
    warningLights: anamnesis.warningLights,
    unusualNoisesSmells: anamnesis.unusualNoisesSmells,
    behaviorChanges: anamnesis.behaviorChanges,
    usageConditions: anamnesis.usageConditions,
    customerObservations: anamnesis.customerObservations,
    createdAt: anamnesis.createdAt.toISOString(),
    updatedAt: anamnesis.updatedAt.toISOString(),
  };
}