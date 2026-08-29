import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { DOMAIN_EVENT_PUBLISHER } from '../../../shared/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '../../../shared/domain/events/domain-event-publisher';
import { PartReservedForServiceOrder } from '../domain/events/part-reserved-for-service-order.event';
import { StockMovement } from '../domain/stock-movement.entity';
import { STOCK_MOVEMENT_REPOSITORY } from '../domain/stock-movement.repository';
import type { StockMovementRepository } from '../domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';

export interface ReservePartInput {
  supplyId: string;
  quantity: number;
  serviceOrderReference: string;
}

export interface ReservePartOutput {
  movement: StockMovement;
  availableBalance: number;
  reservedQuantity: number;
}

@Injectable()
export class ReservePartUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: ReservePartInput): Promise<ReservePartOutput> {
    const supply = await this.supplyRepository.findById(input.supplyId);
    if (!supply) {
      throw new SupplyNotFoundError(input.supplyId);
    }

    // Validates quantity and the service order reference before any ledger
    // access — an invalid request never even attempts the lock.
    const movement = StockMovement.reserve(
      supply.id,
      input.quantity,
      input.serviceOrderReference,
    );

    // The atomic check-and-insert is the repository's job, not this use
    // case's: a read-then-write here would be a TOCTOU race under load
    // (product doc's technical risk #1).
    await this.stockMovementRepository.reserveIfAvailable(movement);

    this.eventPublisher.publish(
      new PartReservedForServiceOrder(
        supply.id,
        movement.quantity,
        movement.serviceOrderReference as string,
      ),
    );

    const [availableBalance, reservedQuantity] = await Promise.all([
      this.stockMovementRepository.getAvailableBalance(supply.id),
      this.stockMovementRepository.getReservedQuantity(supply.id),
    ]);

    return { movement, availableBalance, reservedQuantity };
  }
}
