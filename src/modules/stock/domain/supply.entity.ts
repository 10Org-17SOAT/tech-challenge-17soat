import { randomUUID } from 'node:crypto';
import { InvalidSupplyError } from './errors/invalid-supply.error';

export interface SupplyProps {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateSupplyProps {
  name: string;
  description?: string | null;
  priceInCents: number;
}

export class Supply {
  private constructor(private readonly props: SupplyProps) {}

  static create(props: CreateSupplyProps): Supply {
    const now = new Date();
    return new Supply({
      id: randomUUID(),
      name: Supply.validateName(props.name),
      description: props.description ?? null,
      priceInCents: Supply.validatePrice(props.priceInCents),
      quantity: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new InvalidSupplyError('Supply name must not be empty');
    }
    return trimmed;
  }

  private static validatePrice(priceInCents: number): number {
    if (!Number.isInteger(priceInCents) || priceInCents < 0) {
      throw new InvalidSupplyError(
        'Supply price must be a non-negative integer amount of cents',
      );
    }
    return priceInCents;
  }

  static restore(props: SupplyProps): Supply {
    return new Supply({ ...props });
  }

  update(changes: {
    name?: string;
    description?: string | null;
    priceInCents?: number;
  }): void {
    if (changes.name !== undefined) {
      this.props.name = Supply.validateName(changes.name);
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
    if (changes.priceInCents !== undefined) {
      this.props.priceInCents = Supply.validatePrice(changes.priceInCents);
    }
    this.props.updatedAt = new Date();
  }

  delete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = this.props.deletedAt;
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

  get priceInCents(): number {
    return this.props.priceInCents;
  }

  get quantity(): number {
    return this.props.quantity;
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
