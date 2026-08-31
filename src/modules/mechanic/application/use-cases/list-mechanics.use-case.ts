import { Inject, Injectable } from '@nestjs/common';
import {
  MECHANIC_REPOSITORY,
  type FindMechanicsParams,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import {
  MechanicResponseDTO,
  PaginatedMechanicsDTO,
} from '../dto/mechanic.dto';
import { MechanicResponseMapper } from '../mappers/mechanic-response.mapper';

@Injectable()
export class ListMechanicsUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
  ) {}

  async execute(params: FindMechanicsParams): Promise<PaginatedMechanicsDTO> {
    const result = await this.repository.findMany(params);

    return {
      data: result.data.map((mechanic) =>
        MechanicResponseMapper.toResponseDTO(mechanic),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
