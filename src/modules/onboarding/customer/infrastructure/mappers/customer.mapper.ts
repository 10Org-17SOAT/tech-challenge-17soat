import { users } from '../../../../auth/infrastructure/persistence/schema';
import { CustomerAttributesSchema } from '../../domain/customer-attributes.schema';
import { Customer } from '../../domain/customer.entity';
import { PersonType } from '../../domain/value-objects/person-type.enum';
import { Document } from '../../domain/value-objects/document.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import {
  Phone,
  type PhoneProps,
} from '../../domain/value-objects/phone.value-object';
import { Address } from '../../domain/value-objects/address.value-object';
import type { AddressProps } from '../../domain/value-objects/address.value-object';

/**
 * Row shape derived from the Drizzle table definition.
 * Single source of truth: never hand-write a persistence DTO.
 */
export type CustomerRow = typeof users.$inferSelect;

export type CustomerPersistenceRow = {
  user_id: string;
  name: string;
  email: string;
  document: string;
  phone: PhoneProps;
  attributes: Record<string, unknown>;
  updated_at: Date;
  deleted_at: Date | null;
};

/**
 * Stateless mapper between the Customer aggregate and its persistence row.
 *
 * Layering: infrastructure -> domain only (no application imports).
 * HTTP response mapping lives in the presentation layer.
 */
export class CustomerMapper {
  /**
   * Entity -> database row. Returns the full row so the repository can use it
   * both as insert values and as the `set` payload of an atomic upsert.
   */
  static toPersistence(customer: Customer): CustomerPersistenceRow {
    const primitives = customer.toPrimitives();

    return {
      user_id: primitives.userId,
      name:
        primitives.name ??
        primitives.tradeName ??
        primitives.corporateName ??
        '',
      email: primitives.email,
      document: primitives.document,
      phone: primitives.phone,
      attributes: {
        personType: primitives.personType,
        corporateName: primitives.corporateName,
        tradeName: primitives.tradeName,
        address: primitives.address,
      },
      updated_at: primitives.updatedAt,
      deleted_at: primitives.deletedAt,
    };
  }

  /**
   * Database row -> entity. Rebuilds Value Objects through their constructors,
   * which re-validates the data: corrupted rows fail fast at read time instead
   * of propagating invalid state through the domain.
   */
  static toDomain(row: CustomerRow): Customer {
    const attributes = CustomerAttributesSchema.parse(row.attributes);
    if (row.document === null || row.phone === null) {
      throw new Error('Customer user is missing a document or phone.');
    }
    return Customer.restore({
      id: row.user_id,
      userId: row.user_id,
      personType: attributes.personType as PersonType,
      document: new Document(row.document),
      name: attributes.personType === 'CPF' ? row.name : null,
      corporateName: attributes.corporateName ?? null,
      tradeName: attributes.tradeName ?? null,
      email: new Email(row.email),
      phone: new Phone(row.phone as PhoneProps),
      address: new Address(attributes.address as AddressProps),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
