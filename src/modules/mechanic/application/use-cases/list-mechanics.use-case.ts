import { Inject, Injectable } from '@nestjs/common';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  MECHANIC_REPOSITORY,
  type FindMechanicsParams,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import {
  MechanicResponseDTO,
  PaginatedMechanicsDTO,
} from '../dto/mechanic.dto';

@Injectable()
export class ListMechanicsUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
  ) {}

  async execute(params: FindMechanicsParams): Promise<PaginatedMechanicsDTO> {
    const result = await this.repository.findMany(params);

    return {
      data: result.data.map((mechanic) => this.toResponseDTO(mechanic)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
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
