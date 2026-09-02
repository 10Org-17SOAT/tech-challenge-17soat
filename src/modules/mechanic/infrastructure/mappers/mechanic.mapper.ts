import { Mechanic } from '../../domain/mechanic.entity';
import { Cpf } from '../../domain/value-objects/cpf.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Phone } from '../../domain/value-objects/phone.value-object';
import type { MechanicAvailability } from '../../domain/value-objects/mechanic-availability.enum';
import { mechanicsTable } from '../persistence/mechanic.schema';

/**
 * Row shape derived from the Drizzle table definition.
 * Single source of truth: never hand-write a persistence DTO.
 */
export type MechanicRow = typeof mechanicsTable.$inferSelect;

/**
 * Stateless mapper between the Mechanic aggregate and its persistence row.
 *
 * Layering: infrastructure -> domain only (no application imports).
 * HTTP response mapping lives in the presentation layer.
 */
export class MechanicMapper {
  static toPersistence(mechanic: Mechanic): MechanicRow {
    return mechanic.toPrimitives();
  }

  static toDomain(row: MechanicRow): Mechanic {
    // Rebuilds VOs through constructors: corrupted rows fail fast.
    return Mechanic.restore({
      id: row.id,
      userId: row.userId,
      name: row.name,
      cpf: new Cpf(row.cpf),
      email: new Email(row.email),
      phone: new Phone(row.phone),
      specialties: row.specialties,
      hireDate: row.hireDate,
      availability: row.availability as MechanicAvailability,
      availableSince: row.availableSince,
      currentServiceOrderId: row.currentServiceOrderId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }
}
