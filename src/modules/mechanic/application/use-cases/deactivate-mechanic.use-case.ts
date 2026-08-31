import { Inject, Injectable } from '@nestjs/common';
import {
  MECHANIC_REPOSITORY,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import { AllocatedMechanicException } from '../../domain/exceptions/mechanic.exceptions';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';

@Injectable()
export class DeactivateMechanicUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
  ) {}

  async execute(input: { id: string }): Promise<void> {
    const result = await this.repository.deactivateIfNotAllocated(input.id);

    if (result.status === 'not-found') {
      throw new MechanicNotFoundException(input.id);
    }

    if (result.status === 'allocated') {
      throw new AllocatedMechanicException(input.id);
    }
  }
}
