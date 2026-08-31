import { Inject, Injectable } from '@nestjs/common';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  MECHANIC_REPOSITORY,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import { CreateMechanicInput, MechanicResponseDTO } from '../dto/mechanic.dto';
import { MechanicResponseMapper } from '../mappers/mechanic-response.mapper';

@Injectable()
export class CreateMechanicUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
  ) {}

  async execute(input: CreateMechanicInput): Promise<MechanicResponseDTO> {
    const mechanic = Mechanic.create(input);

    const saved = await this.repository.save(mechanic);

    return MechanicResponseMapper.toResponseDTO(saved);
  }
}
