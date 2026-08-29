import { Inject, Injectable } from '@nestjs/common';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  MECHANIC_REPOSITORY,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';
import { MechanicResponseDTO } from '../dto/mechanic.dto';

@Injectable()
export class GetMechanicByIdUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
  ) {}

  async execute(input: { id: string }): Promise<MechanicResponseDTO> {
    const mechanic = await this.repository.findById(input.id);

    if (mechanic === null) {
      throw new MechanicNotFoundException(input.id);
    }

    return this.toResponseDTO(mechanic);
  }

  private toResponseDTO(mechanic: Mechanic): MechanicResponseDTO {
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
