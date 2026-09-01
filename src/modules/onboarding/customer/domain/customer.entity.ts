import { randomUUID } from 'crypto';
import { PersonType } from './value-objects/person-type.enum';
import { Document } from './value-objects/document.value-object';
import { Email } from './value-objects/email.value-object';
import { Phone } from './value-objects/phone.value-object';
import { Address } from './value-objects/address.value-object';
import { requireUserId } from '../../../../shared/domain/guards/require-user-id';
import { InvalidCustomerException } from './exceptions/customer.exceptions';

export interface CustomerProps {
  id?: string;
  userId?: string | null;
  personType: PersonType;
  document: Document;
  name?: string | null;
  corporateName?: string | null;
  tradeName?: string | null;
  email: Email;
  phone: Phone;
  address: Address;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class Customer {
  private readonly id: string;
  private userId: string | null;
  private readonly personType: PersonType;
  private readonly document: Document;
  private readonly name: string | null;
  private readonly corporateName: string | null;
  private readonly tradeName: string | null;
  private readonly email: Email;
  private readonly phone: Phone;
  private readonly address: Address;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private deletedAt: Date | null;

  private constructor(props: CustomerProps) {
    this.validate(props);

    this.id = props.id ?? randomUUID();
    this.userId = props.userId ?? null;
    this.personType = props.personType;
    this.document = props.document;
    this.name = props.name ?? null;
    this.corporateName = props.corporateName ?? null;
    this.tradeName = props.tradeName ?? null;
    this.email = props.email;
    this.phone = props.phone;
    this.address = props.address;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
    this.deletedAt = props.deletedAt ?? null;
  }

  static create(
    props: Omit<
      CustomerProps,
      'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'
    > & { userId: string },
  ): Customer {
    requireUserId(
      props.userId,
      () =>
        new InvalidCustomerException(
          'A customer requires a linked user account.',
        ),
    );
    return new Customer(props);
  }

  static restore(props: CustomerProps): Customer {
    return new Customer(props);
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string | null {
    return this.userId;
  }

  linkUser(userId: string): void {
    this.userId = userId;
    this.updatedAt = new Date();
  }

  getPersonType(): PersonType {
    return this.personType;
  }

  getDocument(): Document {
    return this.document;
  }

  getName(): string | null {
    return this.name;
  }

  getCorporateName(): string | null {
    return this.corporateName;
  }

  getTradeName(): string | null {
    return this.tradeName;
  }

  getEmail(): Email {
    return this.email;
  }

  getPhone(): Phone {
    return this.phone;
  }

  getAddress(): Address {
    return this.address;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | null {
    return this.deletedAt;
  }

  softDelete(): void {
    this.deletedAt = new Date();
  }

  equals(other: Customer): boolean {
    return this.id === other.getId();
  }

  toPrimitives(): {
    id: string;
    userId: string | null;
    personType: PersonType;
    document: string;
    name: string | null;
    corporateName: string | null;
    tradeName: string | null;
    email: string;
    phone: {
      countryCode: string;
      areaCode: string | null;
      number: string;
    };
    address: {
      street: string;
      number: string;
      complement: string | null;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: this.id,
      userId: this.userId,
      personType: this.personType,
      document: this.document.getValue(),
      name: this.name,
      corporateName: this.corporateName,
      tradeName: this.tradeName,
      email: this.email.getValue(),
      phone: this.phone.toPrimitives(),
      address: this.address.toPrimitives(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  private validate(props: CustomerProps): void {
    if (props.personType === PersonType.CPF) {
      if (!props.name) {
        throw new InvalidCustomerException('PF customer requires a name.');
      }
      if (props.corporateName) {
        throw new InvalidCustomerException(
          'PF customer cannot have a corporateName.',
        );
      }
      if (props.tradeName) {
        throw new InvalidCustomerException(
          'PF customer cannot have a tradeName.',
        );
      }
    }

    if (props.personType === PersonType.CNPJ) {
      if (props.name) {
        throw new InvalidCustomerException('PJ customer cannot have a name.');
      }
      if (!props.corporateName) {
        throw new InvalidCustomerException(
          'PJ customer requires a corporateName.',
        );
      }
      if (!props.tradeName) {
        throw new InvalidCustomerException('PJ customer requires a tradeName.');
      }
    }
  }
}
