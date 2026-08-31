import { randomUUID } from 'node:crypto';
import { ServiceOrderStatus } from '../../service-orders/domain/service-order.entity';
import {
  AnamnesisLockedException,
  InvalidAnamnesisException,
} from './exceptions/anamnesis.exceptions';

export const HOW_STARTED = ['sudden', 'gradual', 'after_event'] as const;
export type HowStarted = (typeof HOW_STARTED)[number];

export const FREQUENCIES = ['constant', 'intermittent', 'rare'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const SEVERITIES = ['light', 'moderate', 'severe'] as const;
export type Severity = (typeof SEVERITIES)[number];

const MAX_MAIN_COMPLAINT = 500;
const MAX_PROBLEM_DESCRIPTION = 4000;
const MAX_OPTIONAL_TEXT = 2000;

export interface AnamnesisProps {
  id: string;
  serviceOrderId: string;
  consultantId: string;
  updatedBy: string | null;
  mainComplaint: string;
  problemDescription: string;
  problemStartedAt: string | null;
  howStarted: HowStarted | null;
  evolution: string | null;
  occurrenceConditions: string | null;
  frequency: Frequency | null;
  severity: Severity | null;
  previousOccurrences: string | null;
  recentMaintenance: string | null;
  warningLights: boolean | null;
  unusualNoisesSmells: string | null;
  behaviorChanges: string | null;
  usageConditions: string | null;
  customerObservations: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateAnamnesisProps {
  serviceOrderId: string;
  consultantId: string;
  mainComplaint: string;
  problemDescription: string;
  problemStartedAt?: string | null;
  howStarted?: HowStarted | null;
  evolution?: string | null;
  occurrenceConditions?: string | null;
  frequency?: Frequency | null;
  severity?: Severity | null;
  previousOccurrences?: string | null;
  recentMaintenance?: string | null;
  warningLights?: boolean | null;
  unusualNoisesSmells?: string | null;
  behaviorChanges?: string | null;
  usageConditions?: string | null;
  customerObservations?: string | null;
}

export interface UpdateAnamnesisProps {
  mainComplaint?: string;
  problemDescription?: string;
  problemStartedAt?: string | null;
  howStarted?: HowStarted | null;
  evolution?: string | null;
  occurrenceConditions?: string | null;
  frequency?: Frequency | null;
  severity?: Severity | null;
  previousOccurrences?: string | null;
  recentMaintenance?: string | null;
  warningLights?: boolean | null;
  unusualNoisesSmells?: string | null;
  behaviorChanges?: string | null;
  usageConditions?: string | null;
  customerObservations?: string | null;
}

/**
 * The customer's account of the problem, captured at reception. It is
 * editable only while the service order is "received"; once the order moves
 * on, the anamnesis becomes a historical record.
 */
export class Anamnesis {
  private constructor(private readonly props: AnamnesisProps) {}

  static create(props: CreateAnamnesisProps): Anamnesis {
    const now = new Date();
    return new Anamnesis({
      id: randomUUID(),
      serviceOrderId: props.serviceOrderId,
      consultantId: props.consultantId,
      updatedBy: null,
      mainComplaint: Anamnesis.validateRequiredText(
        props.mainComplaint,
        MAX_MAIN_COMPLAINT,
        'mainComplaint',
      ),
      problemDescription: Anamnesis.validateRequiredText(
        props.problemDescription,
        MAX_PROBLEM_DESCRIPTION,
        'problemDescription',
      ),
      problemStartedAt: Anamnesis.normalizeOptionalText(
        props.problemStartedAt ?? null,
        MAX_OPTIONAL_TEXT,
        'problemStartedAt',
      ),
      howStarted: Anamnesis.validateEnum(
        props.howStarted ?? null,
        HOW_STARTED,
        'howStarted',
      ),
      evolution: Anamnesis.normalizeOptionalText(
        props.evolution ?? null,
        MAX_OPTIONAL_TEXT,
        'evolution',
      ),
      occurrenceConditions: Anamnesis.normalizeOptionalText(
        props.occurrenceConditions ?? null,
        MAX_OPTIONAL_TEXT,
        'occurrenceConditions',
      ),
      frequency: Anamnesis.validateEnum(
        props.frequency ?? null,
        FREQUENCIES,
        'frequency',
      ),
      severity: Anamnesis.validateEnum(
        props.severity ?? null,
        SEVERITIES,
        'severity',
      ),
      previousOccurrences: Anamnesis.normalizeOptionalText(
        props.previousOccurrences ?? null,
        MAX_OPTIONAL_TEXT,
        'previousOccurrences',
      ),
      recentMaintenance: Anamnesis.normalizeOptionalText(
        props.recentMaintenance ?? null,
        MAX_OPTIONAL_TEXT,
        'recentMaintenance',
      ),
      warningLights: props.warningLights ?? null,
      unusualNoisesSmells: Anamnesis.normalizeOptionalText(
        props.unusualNoisesSmells ?? null,
        MAX_OPTIONAL_TEXT,
        'unusualNoisesSmells',
      ),
      behaviorChanges: Anamnesis.normalizeOptionalText(
        props.behaviorChanges ?? null,
        MAX_OPTIONAL_TEXT,
        'behaviorChanges',
      ),
      usageConditions: Anamnesis.normalizeOptionalText(
        props.usageConditions ?? null,
        MAX_OPTIONAL_TEXT,
        'usageConditions',
      ),
      customerObservations: Anamnesis.normalizeOptionalText(
        props.customerObservations ?? null,
        MAX_OPTIONAL_TEXT,
        'customerObservations',
      ),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: AnamnesisProps): Anamnesis {
    return new Anamnesis({ ...props });
  }

  update(
    changes: UpdateAnamnesisProps,
    updatedBy: string,
    orderStatus: ServiceOrderStatus,
  ): void {
    if (orderStatus !== 'received') {
      throw new AnamnesisLockedException(this.props.serviceOrderId, orderStatus);
    }

    this.props.updatedBy = Anamnesis.validateUpdatedBy(updatedBy);

    if (changes.mainComplaint !== undefined) {
      this.props.mainComplaint = Anamnesis.validateRequiredText(
        changes.mainComplaint,
        MAX_MAIN_COMPLAINT,
        'mainComplaint',
      );
    }
    if (changes.problemDescription !== undefined) {
      this.props.problemDescription = Anamnesis.validateRequiredText(
        changes.problemDescription,
        MAX_PROBLEM_DESCRIPTION,
        'problemDescription',
      );
    }
    if (changes.problemStartedAt !== undefined) {
      this.props.problemStartedAt = Anamnesis.normalizeOptionalText(
        changes.problemStartedAt,
        MAX_OPTIONAL_TEXT,
        'problemStartedAt',
      );
    }
    if (changes.howStarted !== undefined) {
      this.props.howStarted = Anamnesis.validateEnum(
        changes.howStarted,
        HOW_STARTED,
        'howStarted',
      );
    }
    if (changes.evolution !== undefined) {
      this.props.evolution = Anamnesis.normalizeOptionalText(
        changes.evolution,
        MAX_OPTIONAL_TEXT,
        'evolution',
      );
    }
    if (changes.occurrenceConditions !== undefined) {
      this.props.occurrenceConditions = Anamnesis.normalizeOptionalText(
        changes.occurrenceConditions,
        MAX_OPTIONAL_TEXT,
        'occurrenceConditions',
      );
    }
    if (changes.frequency !== undefined) {
      this.props.frequency = Anamnesis.validateEnum(
        changes.frequency,
        FREQUENCIES,
        'frequency',
      );
    }
    if (changes.severity !== undefined) {
      this.props.severity = Anamnesis.validateEnum(
        changes.severity,
        SEVERITIES,
        'severity',
      );
    }
    if (changes.previousOccurrences !== undefined) {
      this.props.previousOccurrences = Anamnesis.normalizeOptionalText(
        changes.previousOccurrences,
        MAX_OPTIONAL_TEXT,
        'previousOccurrences',
      );
    }
    if (changes.recentMaintenance !== undefined) {
      this.props.recentMaintenance = Anamnesis.normalizeOptionalText(
        changes.recentMaintenance,
        MAX_OPTIONAL_TEXT,
        'recentMaintenance',
      );
    }
    if (changes.warningLights !== undefined) {
      this.props.warningLights = changes.warningLights;
    }
    if (changes.unusualNoisesSmells !== undefined) {
      this.props.unusualNoisesSmells = Anamnesis.normalizeOptionalText(
        changes.unusualNoisesSmells,
        MAX_OPTIONAL_TEXT,
        'unusualNoisesSmells',
      );
    }
    if (changes.behaviorChanges !== undefined) {
      this.props.behaviorChanges = Anamnesis.normalizeOptionalText(
        changes.behaviorChanges,
        MAX_OPTIONAL_TEXT,
        'behaviorChanges',
      );
    }
    if (changes.usageConditions !== undefined) {
      this.props.usageConditions = Anamnesis.normalizeOptionalText(
        changes.usageConditions,
        MAX_OPTIONAL_TEXT,
        'usageConditions',
      );
    }
    if (changes.customerObservations !== undefined) {
      this.props.customerObservations = Anamnesis.normalizeOptionalText(
        changes.customerObservations,
        MAX_OPTIONAL_TEXT,
        'customerObservations',
      );
    }

    this.props.updatedAt = new Date();
  }

  delete(orderStatus: ServiceOrderStatus): void {
    if (orderStatus !== 'received') {
      throw new AnamnesisLockedException(this.props.serviceOrderId, orderStatus);
    }
    if (this.props.deletedAt !== null) {
      throw new InvalidAnamnesisException('Anamnesis is already deleted');
    }
    const now = new Date();
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }

  private static validateRequiredText(
    value: string,
    maxLength: number,
    field: string,
  ): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvalidAnamnesisException(`${field} must not be empty`);
    }
    if (trimmed.length > maxLength) {
      throw new InvalidAnamnesisException(
        `${field} must not exceed ${maxLength} characters`,
      );
    }
    return trimmed;
  }

  private static normalizeOptionalText(
    value: string | null,
    maxLength: number,
    field: string,
  ): string | null {
    if (value === null) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > maxLength) {
      throw new InvalidAnamnesisException(
        `${field} must not exceed ${maxLength} characters`,
      );
    }
    return trimmed;
  }

  private static validateEnum<T extends string>(
    value: T | null,
    allowed: readonly T[],
    field: string,
  ): T | null {
    if (value === null) return null;
    if (!allowed.includes(value)) {
      throw new InvalidAnamnesisException(
        `${field} must be one of: ${allowed.join(', ')}`,
      );
    }
    return value;
  }

  private static validateUpdatedBy(updatedBy: string): string {
    const trimmed = updatedBy.trim();
    if (trimmed.length === 0) {
      throw new InvalidAnamnesisException('updatedBy must not be empty');
    }
    return trimmed;
  }

  get id(): string {
    return this.props.id;
  }

  get serviceOrderId(): string {
    return this.props.serviceOrderId;
  }

  get consultantId(): string {
    return this.props.consultantId;
  }

  get updatedBy(): string | null {
    return this.props.updatedBy;
  }

  get mainComplaint(): string {
    return this.props.mainComplaint;
  }

  get problemDescription(): string {
    return this.props.problemDescription;
  }

  get problemStartedAt(): string | null {
    return this.props.problemStartedAt;
  }

  get howStarted(): HowStarted | null {
    return this.props.howStarted;
  }

  get evolution(): string | null {
    return this.props.evolution;
  }

  get occurrenceConditions(): string | null {
    return this.props.occurrenceConditions;
  }

  get frequency(): Frequency | null {
    return this.props.frequency;
  }

  get severity(): Severity | null {
    return this.props.severity;
  }

  get previousOccurrences(): string | null {
    return this.props.previousOccurrences;
  }

  get recentMaintenance(): string | null {
    return this.props.recentMaintenance;
  }

  get warningLights(): boolean | null {
    return this.props.warningLights;
  }

  get unusualNoisesSmells(): string | null {
    return this.props.unusualNoisesSmells;
  }

  get behaviorChanges(): string | null {
    return this.props.behaviorChanges;
  }

  get usageConditions(): string | null {
    return this.props.usageConditions;
  }

  get customerObservations(): string | null {
    return this.props.customerObservations;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
}