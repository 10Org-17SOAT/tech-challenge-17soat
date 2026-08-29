import { customersTable } from '@/modules/onboarding/customer/infrastructure/persistence/customer.schema';
import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';
import { Document } from '@/modules/onboarding/customer/domain/value-objects/document.value-object';
import { Email } from '@/modules/onboarding/customer/domain/value-objects/email.value-object';
import { Phone } from '@/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { Address } from '@/modules/onboarding/customer/domain/value-objects/address.value-object';

/**
 * Row shape derived from the Drizzle table definition.
 * Single source of truth: never hand-write a persistence DTO.
 */
export type CustomerRow = typeof customersTable.$inferSelect;

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
  static toPersistence(customer: Customer): CustomerRow {
    const primitives = customer.toPrimitives();

    return {
      id: primitives.id,
      personType: primitives.personType,
      document: primitives.document,
      name: primitives.name,
      corporateName: primitives.corporateName,
      tradeName: primitives.tradeName,
      email: primitives.email,
      phone: primitives.phone,
      address: primitives.address,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      deletedAt: primitives.deletedAt,
    };
  }

  /**
   * Database row -> entity. Rebuilds Value Objects through their constructors,
   * which re-validates the data: corrupted rows fail fast at read time instead
   * of propagating invalid state through the domain.
   */
  static toDomain(row: CustomerRow): Customer {
    return Customer.restore({
      id: row.id,
      personType: row.personType as PersonType,
      document: new Document(row.document),
      name: row.name,
      corporateName: row.corporateName,
      tradeName: row.tradeName,
      email: new Email(row.email),
      phone: new Phone(row.phone),
      address: new Address(row.address),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }
}
