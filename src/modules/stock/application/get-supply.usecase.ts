import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { Supply } from '../domain/supply.entity';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';

@Injectable()
export class GetSupplyUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
  ) {}

  async execute(id: string): Promise<Supply> {
    const supply = await this.supplyRepository.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }
    return supply;
  }
}
