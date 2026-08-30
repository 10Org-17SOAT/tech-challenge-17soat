import { randomUUID } from 'node:crypto';
import { InvalidServiceOrderError } from './errors/invalid-service-order.error';
import { InvalidServiceOrderTransitionError } from './errors/invalid-service-order-transition.error';
import { ServiceOrderNotDeletableError } from './errors/service-order-not-deletable.error';

export const ORDER_STATUSES = [
  'received',
  'in_diagnosis',
  'awaiting_approval',
  'awaiting_execution',
  'in_execution',
  'finished',
] as const;

export type ServiceOrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_TRANSITIONS: Record<
  ServiceOrderStatus,
  ServiceOrderStatus | null
> = {
  received: 'in_diagnosis',
  in_diagnosis: 'awaiting_approval',
  awaiting_approval: 'awaiting_execution',
  awaiting_execution: 'in_execution',
  in_execution: 'finished',
  finished: null,
};

// Once execution starts, mileage and schedule become historical facts.
const OPERATIONAL_LOCKED_STATUSES = new Set<ServiceOrderStatus>([
  'in_execution',
  'finished',
]);

export interface ServiceOrderProps {
  id: string;
  status: ServiceOrderStatus;
  approvedByCustomer: boolean;
  notes: string | null;
  vehicleMileageAtEntry: number | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateServiceOrderProps {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

export interface UpdateServiceOrderProps {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

export class ServiceOrder {
  private constructor(private readonly props: ServiceOrderProps) {}

  static create(props: CreateServiceOrderProps): ServiceOrder {
    const now = new Date();
    return new ServiceOrder({
      id: randomUUID(),
      status: 'received',
      approvedByCustomer: false,
      notes: ServiceOrder.normalizeNotes(props.notes ?? null),
      vehicleMileageAtEntry: ServiceOrder.validateMileage(
        props.vehicleMileageAtEntry ?? null,
      ),
      scheduledAt: props.scheduledAt ?? null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: ServiceOrderProps): ServiceOrder {
    return new ServiceOrder({ ...props });
  }

  update(changes: UpdateServiceOrderProps): void {
    const operationalLocked = OPERATIONAL_LOCKED_STATUSES.has(
      this.props.status,
    );

    if (changes.notes !== undefined) {
      this.props.notes = ServiceOrder.normalizeNotes(changes.notes);
    }

    if (changes.vehicleMileageAtEntry !== undefined) {
      if (operationalLocked) {
        throw new InvalidServiceOrderError(
          `Vehicle mileage cannot be updated once the order reaches "${this.props.status}"`,
        );
      }
      this.props.vehicleMileageAtEntry = ServiceOrder.validateMileage(
        changes.vehicleMileageAtEntry,
      );
    }

    if (changes.scheduledAt !== undefined) {
      if (operationalLocked) {
        throw new InvalidServiceOrderError(
          `Scheduled date cannot be updated once the order reaches "${this.props.status}"`,
        );
      }
      this.props.scheduledAt = changes.scheduledAt;
    }

    this.props.updatedAt = new Date();
  }

  transitionTo(next: ServiceOrderStatus): void {
    const expected = STATUS_TRANSITIONS[this.props.status];
    if (expected !== next) {
      throw new InvalidServiceOrderTransitionError(this.props.status, next);
    }

    const now = new Date();
    this.props.status = next;

    if (next === 'awaiting_execution') {
      this.props.approvedByCustomer = true;
    }
    if (next === 'in_execution') {
      this.props.startedAt = now;
    }
    if (next === 'finished') {
      this.props.completedAt = now;
    }

    this.props.updatedAt = now;
  }

  delete(): void {
    if (this.props.status !== 'received') {
      throw new ServiceOrderNotDeletableError(this.props.status);
    }
    const now = new Date();
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }

  private static normalizeNotes(notes: string | null): string | null {
    if (notes === null) return null;
    const trimmed = notes.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private static validateMileage(value: number | null): number | null {
    if (value === null) return null;
    if (!Number.isInteger(value) || value < 0) {
      throw new InvalidServiceOrderError(
        'Vehicle mileage must be a non-negative integer',
      );
    }
    return value;
  }

  get id(): string {
    return this.props.id;
  }

  get status(): ServiceOrderStatus {
    return this.props.status;
  }

  get approvedByCustomer(): boolean {
    return this.props.approvedByCustomer;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get vehicleMileageAtEntry(): number | null {
    return this.props.vehicleMileageAtEntry;
  }

  get scheduledAt(): Date | null {
    return this.props.scheduledAt;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
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
