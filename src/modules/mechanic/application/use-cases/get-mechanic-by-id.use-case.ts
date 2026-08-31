import { Inject, Injectable } from '@nestjs/common';
import {
  MECHANIC_REPOSITORY,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';
import { MechanicResponseDTO } from '../dto/mechanic.dto';
import { MechanicResponseMapper } from '../mappers/mechanic-response.mapper';

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

    return MechanicResponseMapper.toResponseDTO(mechanic);
  }
}
