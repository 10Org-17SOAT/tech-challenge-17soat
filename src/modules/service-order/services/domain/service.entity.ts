import { randomUUID } from 'node:crypto';
import { InvalidServiceError } from './errors/invalid-service.error';

export const SERVICE_CATEGORIES = [
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

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface ServiceProps {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  priceInCents: number;
  estimatedDuration: number | null;
  warrantyDays: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateServiceProps {
  name: string;
  description?: string | null;
  category: ServiceCategory;
  priceInCents: number;
  estimatedDuration?: number | null;
  warrantyDays?: number | null;
}

export class Service {
  private constructor(private readonly props: ServiceProps) {}

  static create(props: CreateServiceProps): Service {
    const now = new Date();
    return new Service({
      id: randomUUID(),
      name: Service.validateName(props.name),
      description: props.description ?? null,
      category: props.category,
      priceInCents: Service.validatePrice(props.priceInCents),
      estimatedDuration: Service.validatePositiveIntOrNull(
        props.estimatedDuration ?? null,
        'Estimated duration',
      ),
      warrantyDays: Service.validatePositiveIntOrNull(
        props.warrantyDays ?? null,
        'Warranty days',
      ),
      active: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: ServiceProps): Service {
    return new Service({ ...props });
  }

  update(changes: {
    name?: string;
    description?: string | null;
    category?: ServiceCategory;
    priceInCents?: number;
    estimatedDuration?: number | null;
    warrantyDays?: number | null;
    active?: boolean;
  }): void {
    if (changes.name !== undefined) {
      this.props.name = Service.validateName(changes.name);
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
    if (changes.category !== undefined) {
      this.props.category = changes.category;
    }
    if (changes.priceInCents !== undefined) {
      this.props.priceInCents = Service.validatePrice(changes.priceInCents);
    }
    if (changes.estimatedDuration !== undefined) {
      this.props.estimatedDuration = Service.validatePositiveIntOrNull(
        changes.estimatedDuration,
        'Estimated duration',
      );
    }
    if (changes.warrantyDays !== undefined) {
      this.props.warrantyDays = Service.validatePositiveIntOrNull(
        changes.warrantyDays,
        'Warranty days',
      );
    }
    if (changes.active !== undefined) {
      this.props.active = changes.active;
    }
    this.props.updatedAt = new Date();
  }

  delete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = this.props.deletedAt;
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new InvalidServiceError('Service name must not be empty');
    }
    return trimmed;
  }

  private static validatePrice(priceInCents: number): number {
    if (!Number.isInteger(priceInCents) || priceInCents < 0) {
      throw new InvalidServiceError(
        'Service price must be a non-negative integer amount of cents',
      );
    }
    return priceInCents;
  }

  private static validatePositiveIntOrNull(
    value: number | null,
    field: string,
  ): number | null {
    if (value === null) return null;
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidServiceError(
        `${field} must be a positive integer if provided`,
      );
    }
    return value;
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get category(): ServiceCategory {
    return this.props.category;
  }

  get priceInCents(): number {
    return this.props.priceInCents;
  }

  get estimatedDuration(): number | null {
    return this.props.estimatedDuration;
  }

  get warrantyDays(): number | null {
    return this.props.warrantyDays;
  }

  get active(): boolean {
    return this.props.active;
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
