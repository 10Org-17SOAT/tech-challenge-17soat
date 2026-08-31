import { Mechanic } from '../../domain/mechanic.entity';
import { MechanicResponseDTO } from '../dto/mechanic.dto';

/**
 * Maps the Mechanic aggregate to the application response DTO.
 *
 * Single home for the entity -> DTO shape (excludes persistence-only fields
 * such as currentServiceOrderId and deletedAt). Lives in the application layer
 * because the DTO does; the infrastructure mapper stays persistence-only.
 */
export class MechanicResponseMapper {
  static toResponseDTO(mechanic: Mechanic): MechanicResponseDTO {
    const primitives = mechanic.toPrimitives();
    return {
      id: primitives.id,
      name: primitives.name,
      cpf: primitives.cpf,
      email: primitives.email,
      phone: primitives.phone,
      specialties: primitives.specialties,
      hireDate: primitives.hireDate,
      availability: primitives.availability,
      availableSince: primitives.availableSince,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}