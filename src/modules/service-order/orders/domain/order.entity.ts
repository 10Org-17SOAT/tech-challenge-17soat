import { randomUUID } from 'node:crypto';
import { InvalidOrderError } from './errors/invalid-order.error';
import { InvalidOrderTransitionError } from './errors/invalid-order-transition.error';
import { OrderNotDeletableError } from './errors/order-not-deletable.error';

export const ORDER_STATUSES = [
  'received',
  'in_diagnosis',
  'awaiting_approval',
  'awaiting_execution',
  'in_execution',
  'finished',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  received: 'in_diagnosis',
  in_diagnosis: 'awaiting_approval',
  awaiting_approval: 'awaiting_execution',
  awaiting_execution: 'in_execution',
  in_execution: 'finished',
  finished: null,
};

// Once execution starts, mileage and schedule become historical facts.
const OPERATIONAL_LOCKED_STATUSES = new Set<OrderStatus>([
  'in_execution',
  'finished',
]);

export interface OrderProps {
  id: string;
  status: OrderStatus;
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

export interface CreateOrderProps {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

export interface UpdateOrderProps {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

export class Order {
  private constructor(private readonly props: OrderProps) {}

  static create(props: CreateOrderProps): Order {
    const now = new Date();
    return new Order({
      id: randomUUID(),
      status: 'received',
      approvedByCustomer: false,
      notes: Order.normalizeNotes(props.notes ?? null),
      vehicleMileageAtEntry: Order.validateMileage(
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

  static restore(props: OrderProps): Order {
    return new Order({ ...props });
  }

  update(changes: UpdateOrderProps): void {
    const operationalLocked = OPERATIONAL_LOCKED_STATUSES.has(
      this.props.status,
    );

    if (changes.notes !== undefined) {
      this.props.notes = Order.normalizeNotes(changes.notes);
    }

    if (changes.vehicleMileageAtEntry !== undefined) {
      if (operationalLocked) {
        throw new InvalidOrderError(
          `Vehicle mileage cannot be updated once the order reaches "${this.props.status}"`,
        );
      }
      this.props.vehicleMileageAtEntry = Order.validateMileage(
        changes.vehicleMileageAtEntry,
      );
    }

    if (changes.scheduledAt !== undefined) {
      if (operationalLocked) {
        throw new InvalidOrderError(
          `Scheduled date cannot be updated once the order reaches "${this.props.status}"`,
        );
      }
      this.props.scheduledAt = changes.scheduledAt;
    }

    this.props.updatedAt = new Date();
  }

  transitionTo(next: OrderStatus): void {
    const expected = STATUS_TRANSITIONS[this.props.status];
    if (expected !== next) {
      throw new InvalidOrderTransitionError(this.props.status, next);
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
      throw new OrderNotDeletableError(this.props.status);
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
      throw new InvalidOrderError(
        'Vehicle mileage must be a non-negative integer',
      );
    }
    return value;
  }

  get id(): string {
    return this.props.id;
  }

  get status(): OrderStatus {
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
