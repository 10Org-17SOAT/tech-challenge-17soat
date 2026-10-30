import { Mechanic } from '../../domain/mechanic.entity';
import { MechanicAttributesSchema } from '../../domain/mechanic-attributes.schema';
import { Cpf } from '../../domain/value-objects/cpf.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import type { PhoneProps } from '../../domain/value-objects/phone.value-object';
import { Phone } from '../../domain/value-objects/phone.value-object';
import {
  MECHANIC_AVAILABILITY,
  type MechanicAvailability,
} from '../../domain/value-objects/mechanic-availability.enum';
import { users } from '../../../auth/infrastructure/persistence/schema';
import { mechanicAvailability } from '../persistence/mechanic.schema';

export type MechanicRow = {
  userId: string;
  name: string;
  email: string;
  document: string | null;
  phone: unknown;
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  availability: string;
  availableSince: Date;
  currentServiceOrderId: string | null;
};

export const mechanicProfileSelection = {
  userId: users.user_id,
  name: users.name,
  email: users.email,
  document: users.document,
  phone: users.phone,
  attributes: users.attributes,
  createdAt: users.created_at,
  updatedAt: users.updated_at,
  deletedAt: users.deleted_at,
};

export const mechanicSelection = {
  ...mechanicProfileSelection,
  availability: mechanicAvailability.availability,
  availableSince: mechanicAvailability.availableSince,
  currentServiceOrderId: mechanicAvailability.currentServiceOrderId,
};

export class MechanicMapper {
  static toPersistence(mechanic: Mechanic): {
    profile: Pick<
      typeof users.$inferInsert,
      | 'user_id'
      | 'name'
      | 'email'
      | 'document'
      | 'phone'
      | 'attributes'
      | 'updated_at'
      | 'deleted_at'
    >;
    availability: typeof mechanicAvailability.$inferInsert;
  } {
    const primitives = mechanic.toPrimitives();
    return {
      profile: {
        user_id: primitives.userId,
        name: primitives.name,
        email: primitives.email,
        document: primitives.cpf,
        phone: primitives.phone,
        attributes: {
          specialties: primitives.specialties,
          hireDate: primitives.hireDate.toISOString(),
        },
        updated_at: primitives.updatedAt,
        deleted_at: primitives.deletedAt,
      },
      availability: {
        userId: primitives.userId,
        availability: primitives.availability,
        availableSince: primitives.availableSince,
        currentServiceOrderId: primitives.currentServiceOrderId,
      },
    };
  }

  static toDomain(row: MechanicRow): Mechanic {
    const attributes = MechanicAttributesSchema.parse(row.attributes);
    if (row.document === null) {
      throw new Error('Mechanic user is missing a document.');
    }
    return Mechanic.restore({
      id: row.userId,
      userId: row.userId,
      name: row.name,
      cpf: new Cpf(row.document),
      email: new Email(row.email),
      phone: new Phone(row.phone as PhoneProps),
      specialties: attributes.specialties,
      hireDate: attributes.hireDate,
      availability: row.availability as MechanicAvailability,
      availableSince: row.availableSince,
      currentServiceOrderId: row.currentServiceOrderId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }
}
