import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type {
  ExecutionTimeFilter,
  ServiceOrderRepository,
} from '../domain/service-order.repository';

export interface AverageExecutionTimeOutput {
  averageExecutionTimeMinutes: number | null;
  sampleSize: number;
}

@Injectable()
export class GetAverageExecutionTimeUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(
    filter: ExecutionTimeFilter,
  ): Promise<AverageExecutionTimeOutput> {
    const { averageMinutes, sampleSize } =
      await this.orderRepository.averageExecutionTime(filter);

    return {
      // Whole minutes, to speak the same unit as the catalogue's
      // `estimatedDuration`. Sub-minute precision on a shop-floor average is
      // noise, not information.
      averageExecutionTimeMinutes:
        averageMinutes === null ? null : Math.round(averageMinutes),
      sampleSize,
    };
  }
}
