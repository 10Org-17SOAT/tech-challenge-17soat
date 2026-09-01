import { randomUUID } from 'node:crypto';
import { Cpf } from '../../../shared/domain/value-objects/cpf.vo';
import { InvalidStockKeeperError } from './errors/invalid-stock-keeper.error';
import { Phone } from './value-objects/phone.vo';

const invalidCpf = (raw: string) =>
  new InvalidStockKeeperError(`Invalid CPF: "${raw}"`);

export interface StockKeeperProps {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateStockKeeperProps {
  name: string;
  cpf: string;
  phone: string;
}

interface InternalProps {
  id: string;
  name: string;
  cpf: Cpf;
  phone: Phone;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class StockKeeper {
  private constructor(private readonly props: InternalProps) {}

  static create(props: CreateStockKeeperProps): StockKeeper {
    const now = new Date();
    return new StockKeeper({
      id: randomUUID(),
      name: props.name,
      cpf: Cpf.create(props.cpf, invalidCpf),
      phone: Phone.create(props.phone),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: StockKeeperProps): StockKeeper {
    return new StockKeeper({
      id: props.id,
      name: props.name,
      cpf: Cpf.create(props.cpf, invalidCpf),
      phone: Phone.create(props.phone),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
    });
  }

  update(changes: { name?: string; phone?: string }): void {
    if (changes.name !== undefined) {
      this.props.name = changes.name;
    }
    if (changes.phone !== undefined) {
      this.props.phone = Phone.create(changes.phone);
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

  get cpf(): string {
    return this.props.cpf.value;
  }

  get phone(): string {
    return this.props.phone.value;
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
