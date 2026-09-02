import { randomUUID } from 'node:crypto';
import { Price } from './value-objects/price.vo';
import { SupplyName } from './value-objects/supply-name.vo';

export interface SupplyProps {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateSupplyProps {
  name: string;
  description?: string | null;
  priceInCents: number;
}

interface InternalProps {
  id: string;
  name: SupplyName;
  description: string | null;
  price: Price;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Supply {
  private constructor(private readonly props: InternalProps) {}

  static create(props: CreateSupplyProps): Supply {
    const now = new Date();
    return new Supply({
      id: randomUUID(),
      name: SupplyName.create(props.name),
      description: props.description ?? null,
      price: Price.create(props.priceInCents),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: SupplyProps): Supply {
    return new Supply({
      id: props.id,
      name: SupplyName.create(props.name),
      description: props.description,
      price: Price.create(props.priceInCents),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
    });
  }

  update(changes: {
    name?: string;
    description?: string | null;
    priceInCents?: number;
  }): void {
    if (changes.name !== undefined) {
      this.props.name = SupplyName.create(changes.name);
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
    if (changes.priceInCents !== undefined) {
      this.props.price = Price.create(changes.priceInCents);
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
    return this.props.name.value;
  }

  get description(): string | null {
    return this.props.description;
  }

  get priceInCents(): number {
    return this.props.price.inCents;
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
