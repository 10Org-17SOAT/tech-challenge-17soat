import { randomUUID } from 'node:crypto';
import type { DomainEvent } from '../../../../shared/domain/events/domain-event';
import { ServiceOrderStatusChanged } from './events/service-order-status-changed.event';
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
  'delivered',
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
  // Payment is what closes an order: the payment context publishes
  // `payment.received` and this is the transition its handler drives.
  finished: 'delivered',
  delivered: null,
};

// The shop's work queue, most urgent first: the default listing shows only
// these, in this order. `awaiting_execution` (approved, waiting for a
// mechanic) sits right below `in_execution` because it is the next one to hit
// the bench. Finished and delivered orders are closed and stay out unless
// asked for by an explicit status filter.
export const LISTING_STATUS_PRIORITY: readonly ServiceOrderStatus[] = [
  'in_execution',
  'awaiting_execution',
  'awaiting_approval',
  'in_diagnosis',
  'received',
];

// Once execution starts, mileage and schedule become historical facts.
const OPERATIONAL_LOCKED_STATUSES = new Set<ServiceOrderStatus>([
  'in_execution',
  'finished',
  'delivered',
]);

export interface ServiceOrderProps {
  id: string;
  vehicleId: string;
  openedById: string;
  openedByName: string;
  status: ServiceOrderStatus;
  approvedByCustomer: boolean;
  notes: string | null;
  vehicleMileageAtEntry: number | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateServiceOrderProps {
  vehicleId: string;
  openedById: string;
  openedByName: string;
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
  // Raised by this instance and not yet published. Held here rather than
  // published on the spot: the write that makes them true has not happened
  // yet, and an order that fails to save must not have announced anything.
  private pendingEvents: DomainEvent[] = [];

  private constructor(private readonly props: ServiceOrderProps) {}

  static create(props: CreateServiceOrderProps): ServiceOrder {
    const now = new Date();
    const order = new ServiceOrder({
      id: randomUUID(),
      vehicleId: ServiceOrder.validateVehicleId(props.vehicleId),
      openedById: props.openedById,
      openedByName: props.openedByName,
      status: 'received',
      approvedByCustomer: false,
      notes: ServiceOrder.normalizeNotes(props.notes ?? null),
      vehicleMileageAtEntry: ServiceOrder.validateMileage(
        props.vehicleMileageAtEntry ?? null,
      ),
      scheduledAt: props.scheduledAt ?? null,
      startedAt: null,
      completedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    // Opening counts as a status change: the customer hears about `received`
    // the same way they hear about every status after it.
    order.pendingEvents.push(
      new ServiceOrderStatusChanged(order.id, null, 'received', now),
    );
    return order;
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
    const previous = this.props.status;
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
    if (next === 'delivered') {
      this.props.deliveredAt = now;
    }

    this.props.updatedAt = now;
    this.pendingEvents.push(
      new ServiceOrderStatusChanged(this.props.id, previous, next, now),
    );
  }

  /** Hands over the events raised since the last call and forgets them, so
   *  saving the same instance twice never announces anything twice. */
  pullEvents(): DomainEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  delete(): void {
    if (this.props.status !== 'received') {
      throw new ServiceOrderNotDeletableError(this.props.status);
    }
    const now = new Date();
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }

  // The car the order is about. Never edited: an order opened for the wrong
  // vehicle is cancelled and reopened, not repointed — the diagnosis, the
  // quotation and the customer it was emailed to all hang off this.
  private static validateVehicleId(vehicleId: string): string {
    const trimmed = (vehicleId ?? '').trim();
    if (trimmed.length === 0) {
      throw new InvalidServiceOrderError(
        'Service order must reference a vehicle',
      );
    }
    return trimmed;
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

  get vehicleId(): string {
    return this.props.vehicleId;
  }

  // Snapshot, not a live reference: the order must stay truthful about who
  // opened it even if that consultant is later renamed or deleted, the same
  // pattern as `performed_by` on the stock ledger. Never edited after create.
  get openedById(): string {
    return this.props.openedById;
  }

  get openedByName(): string {
    return this.props.openedByName;
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

  get deliveredAt(): Date | null {
    return this.props.deliveredAt;
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
