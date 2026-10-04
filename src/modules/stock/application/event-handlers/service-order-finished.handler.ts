import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ServiceOrderFinished } from '../../../service-management/service-orders/domain/events/service-order-finished.event';
import { STOCK_MOVEMENT_REPOSITORY } from '../../domain/stock-movement.repository';
import type { StockMovementRepository } from '../../domain/stock-movement.repository';
import { WriteOffReservedPartUseCase } from '../write-off-reserved-part.usecase';

/**
 * The other half of the automation: an order that reached `finished` had its
 * parts fitted, so what it still holds reserved is now consumed.
 *
 * What to write off comes from the ledger, not from the quotation. The ledger
 * is what actually happened — a line that could not be reserved at approval
 * time, or one a stock keeper reserved by hand, is accounted for here either
 * way, while re-reading the quotation would write off units that were never
 * reserved and fail.
 */
@Injectable()
export class ServiceOrderFinishedHandler {
  private readonly logger = new Logger(ServiceOrderFinishedHandler.name);

  constructor(
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly writeOffReservedPart: WriteOffReservedPartUseCase,
  ) {}

  @OnEvent('service-order.finished')
  async handle(event: ServiceOrderFinished): Promise<void> {
    const outstanding =
      await this.stockMovementRepository.findOutstandingReservations(
        event.serviceOrderId,
      );

    // Sequential for the same reason as the reservation side: one row lock
    // per supply, taken one at a time.
    for (const reservation of outstanding) {
      try {
        await this.writeOffReservedPart.execute({
          supplyId: reservation.supplyId,
          quantity: reservation.quantity,
          serviceOrderReference: event.serviceOrderId,
        });
      } catch (error) {
        // Every quantity here was just read as outstanding, so the use case's
        // own refusals should be unreachable. If one does happen, it means
        // something wrote the ledger in between — log which line and carry on
        // rather than abandon the others.
        this.logger.error(
          `Order ${event.serviceOrderId}: could not write off supply ${reservation.supplyId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
