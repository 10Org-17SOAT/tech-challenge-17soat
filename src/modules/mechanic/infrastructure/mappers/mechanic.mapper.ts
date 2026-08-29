import { Injectable } from '@nestjs/common';
import { Mechanic } from '../../domain/mechanic.entity';
import { Cpf } from '../../domain/value-objects/cpf.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Phone } from '../../domain/value-objects/phone.value-object';
import type { PhoneProps } from '../../domain/value-objects/phone.value-object';
import type { Specialty } from '../../domain/value-objects/specialty.enum';
import type { MechanicAvailability } from '../../domain/value-objects/mechanic-availability.enum';

export interface MechanicRow {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: PhoneProps;
  specialties: Specialty[];
  hireDate: Date;
  availability: MechanicAvailability;
  availableSince: Date;
  currentServiceOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class MechanicMapper {
  toPersistence(mechanic: Mechanic): MechanicRow {
    return mechanic.toPrimitives();
  }

  toDomain(row: MechanicRow): Mechanic {
    // Rebuilds VOs through constructors: corrupted rows fail fast.
    return Mechanic.restore({
      id: row.id,
      name: row.name,
      cpf: new Cpf(row.cpf),
      email: new Email(row.email),
      phone: new Phone(row.phone),
      specialties: row.specialties,
      hireDate: row.hireDate,
      availability: row.availability,
      availableSince: row.availableSince,
      currentServiceOrderId: row.currentServiceOrderId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }
}