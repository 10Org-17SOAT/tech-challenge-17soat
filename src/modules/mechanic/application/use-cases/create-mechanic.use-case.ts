import { Inject, Injectable } from '@nestjs/common';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  MECHANIC_REPOSITORY,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import {
  CreateMechanicInput,
  MechanicResponseDTO,
} from '../dto/mechanic.dto';

@Injectable()
export class CreateMechanicUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
  ) {}

  async execute(input: CreateMechanicInput): Promise<MechanicResponseDTO> {
    const mechanic = Mechanic.create(input);

    const saved = await this.repository.save(mechanic);

    return this.toResponseDTO(saved);
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