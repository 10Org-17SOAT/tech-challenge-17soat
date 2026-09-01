import { randomUUID } from 'crypto';
import { Cpf } from './value-objects/cpf.value-object';
import { Email } from './value-objects/email.value-object';
import { Phone, type PhoneProps } from './value-objects/phone.value-object';
import { requireUserId } from '../../../shared/domain/guards/require-user-id';
import {
  MECHANIC_AVAILABILITY,
  type MechanicAvailability,
} from './value-objects/mechanic-availability.enum';
import type { Specialty } from './value-objects/specialty.enum';
import {
  AllocatedMechanicException,
  InvalidMechanicException,
  MechanicNotAllocatedException,
  MechanicNotAvailableException,
  WrongServiceOrderException,
} from './exceptions/mechanic.exceptions';

export interface CreateMechanicProps {
  userId: string;
  name: string;
  cpf: string;
  email: string;
  phone: PhoneProps;
  specialties: Specialty[];
  hireDate: Date;
}

export interface MechanicProps {
  id: string;
  userId: string | null;
  name: string;
  cpf: Cpf;
  email: Email;
  phone: Phone;
  specialties: Specialty[];
  hireDate: Date;
  availability: MechanicAvailability;
  availableSince: Date;
  currentServiceOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UpdateMechanicProfileProps {
  name?: string;
  email?: string;
  phone?: PhoneProps;
  specialties?: Specialty[];
  hireDate?: Date;
}

/**
 * Mechanic aggregate root.
 *
 * The state machine lives in two places by design:
 *
 * - **Production (source of truth): the SQL layer.** Transitions are executed
 *   atomically by the repository (`claimIfAvailable`, `releaseIfAllocated`,
 *   `deactivateIfNotAllocated`) using conditional UPDATEs with row locking
 *   (`FOR UPDATE SKIP LOCKED`), which is what makes concurrent claims safe.
 * - **Reference semantics: the entity methods below.** `claim()`, `release()`
 *   and `deactivate()` encode the same transition rules for the in-memory fake
 *   and for test seeding. They are NOT used by the Drizzle adapter.
 *
 * The parity between the two is guarded by the repository contract test
 * (`__test__/mechanic-repository.contract.ts`), which runs against both the
 * fake and the Drizzle adapter.
 */
export class Mechanic {
  private readonly id: string;
  private userId: string | null;
  private readonly cpf: Cpf;
  private name: string;
  private email: Email;
  private phone: Phone;
  private specialties: Specialty[];
  private hireDate: Date;
  private availability: MechanicAvailability;
  private availableSince: Date;
  private currentServiceOrderId: string | null;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private deletedAt: Date | null;

  private constructor(props: MechanicProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name;
    this.cpf = props.cpf;
    this.email = props.email;
    this.phone = props.phone;
    this.specialties = props.specialties;
    this.hireDate = props.hireDate;
    this.availability = props.availability;
    this.availableSince = props.availableSince;
    this.currentServiceOrderId = props.currentServiceOrderId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  static create(props: CreateMechanicProps): Mechanic {
    const userId = requireUserId(
      props.userId,
      () =>
        new InvalidMechanicException(
          'A mechanic requires a linked user account.',
        ),
    );

    const name = this.validateName(props.name);
    this.validateSpecialties(props.specialties);

    const now = new Date();

    return new Mechanic({
      id: randomUUID(),
      userId,
      name,
      cpf: new Cpf(props.cpf),
      email: new Email(props.email),
      phone: new Phone(props.phone),
      specialties: [...props.specialties],
      hireDate: props.hireDate,
      availability: MECHANIC_AVAILABILITY.Available,
      availableSince: now,
      currentServiceOrderId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: MechanicProps): Mechanic {
    return new Mechanic({ ...props, specialties: [...props.specialties] });
  }

  updateProfile(changes: UpdateMechanicProfileProps): void {
    if (changes.name !== undefined) {
      this.name = Mechanic.validateName(changes.name);
    }
    if (changes.email !== undefined) {
      this.email = new Email(changes.email);
    }
    if (changes.phone !== undefined) {
      this.phone = new Phone(changes.phone);
    }
    if (changes.specialties !== undefined) {
      Mechanic.validateSpecialties(changes.specialties);
      this.specialties = [...changes.specialties];
    }
    if (changes.hireDate !== undefined) {
      this.hireDate = changes.hireDate;
    }
    this.updatedAt = new Date();
  }

  claim(serviceOrderId: string): void {
    if (this.availability !== MECHANIC_AVAILABILITY.Available) {
      throw new MechanicNotAvailableException(this.id);
    }

    const trimmed = serviceOrderId.trim();
    if (trimmed.length === 0) {
      throw new InvalidMechanicException(
        'A claim requires a service order id.',
      );
    }

    this.availability = MECHANIC_AVAILABILITY.Allocated;
    this.currentServiceOrderId = trimmed;
    this.updatedAt = new Date();
  }

  release(serviceOrderId: string): void {
    if (this.availability !== MECHANIC_AVAILABILITY.Allocated) {
      throw new MechanicNotAllocatedException(this.id);
    }

    if (this.currentServiceOrderId !== serviceOrderId) {
      throw new WrongServiceOrderException(this.id, serviceOrderId);
    }

    this.availability = MECHANIC_AVAILABILITY.Available;
    this.availableSince = new Date();
    this.currentServiceOrderId = null;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.availability === MECHANIC_AVAILABILITY.Allocated) {
      throw new AllocatedMechanicException(this.id);
    }

    this.availability = MECHANIC_AVAILABILITY.Inactive;
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  /** The auth account this mechanic acts as. Null only on legacy rows. */
  getUserId(): string | null {
    return this.userId;
  }

  getName(): string {
    return this.name;
  }

  getCpf(): Cpf {
    return this.cpf;
  }

  getEmail(): Email {
    return this.email;
  }

  getPhone(): Phone {
    return this.phone;
  }

  getSpecialties(): Specialty[] {
    return [...this.specialties];
  }

  getHireDate(): Date {
    return this.hireDate;
  }

  getAvailability(): MechanicAvailability {
    return this.availability;
  }

  getAvailableSince(): Date {
    return this.availableSince;
  }

  getCurrentServiceOrderId(): string | null {
    return this.currentServiceOrderId;
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

  equals(other: Mechanic): boolean {
    return this.id === other.getId();
  }

  toPrimitives(): {
    id: string;
    userId: string | null;
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
  } {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      cpf: this.cpf.getValue(),
      email: this.email.getValue(),
      phone: this.phone.toPrimitives(),
      specialties: [...this.specialties],
      hireDate: this.hireDate,
      availability: this.availability,
      availableSince: this.availableSince,
      currentServiceOrderId: this.currentServiceOrderId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new InvalidMechanicException('Mechanic name must not be empty.');
    }
    return trimmed;
  }

  private static validateSpecialties(specialties: Specialty[]): void {
    if (specialties.length === 0) {
      throw new InvalidMechanicException(
        'A mechanic requires at least one specialty.',
      );
    }
  }
}
