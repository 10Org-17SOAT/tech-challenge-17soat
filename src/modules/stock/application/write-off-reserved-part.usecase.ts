import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '@/modules/stock/domain/errors/supply-not-found.error';
import { DOMAIN_EVENT_PUBLISHER } from '@/modules/stock/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '@/modules/stock/domain/events/domain-event-publisher';
import { PartWrittenOffFromStock } from '@/modules/stock/domain/events/part-written-off-from-stock.event';
import { StockMovement } from '@/modules/stock/domain/stock-movement.entity';
import { STOCK_MOVEMENT_REPOSITORY } from '@/modules/stock/domain/stock-movement.repository';
import type { StockMovementRepository } from '@/modules/stock/domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '@/modules/stock/domain/supply.repository';
import type { SupplyRepository } from '@/modules/stock/domain/supply.repository';

export interface WriteOffReservedPartInput {
  supplyId: string;
  quantity: number;
  serviceOrderReference: string;
}

export interface WriteOffReservedPartOutput {
  movement: StockMovement;
  reservedQuantity: number;
}

@Injectable()
export class WriteOffReservedPartUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    input: WriteOffReservedPartInput,
  ): Promise<WriteOffReservedPartOutput> {
    const supply = await this.supplyRepository.findById(input.supplyId);
    if (!supply) {
      throw new SupplyNotFoundError(input.supplyId);
    }

    const movement = StockMovement.consume(
      supply.id,
      input.quantity,
      input.serviceOrderReference,
    );
    await this.stockMovementRepository.writeOffIfReserved(movement);

    this.eventPublisher.publish(
      new PartWrittenOffFromStock(
        supply.id,
        movement.quantity,
        movement.serviceOrderReference as string,
      ),
    );

    const reservedQuantity =
      await this.stockMovementRepository.getReservedQuantity(
        supply.id,
        input.serviceOrderReference,
      );

    return { movement, reservedQuantity };
  }
}
