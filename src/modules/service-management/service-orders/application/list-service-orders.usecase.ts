import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type {
  ListServiceOrdersFilter,
  ServiceOrderRepository,
} from '../domain/service-order.repository';

export interface ListServiceOrdersOutput {
  items: ServiceOrder[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListServiceOrdersUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(filter: ListServiceOrdersFilter): Promise<ListServiceOrdersOutput> {
    const { items, total } = await this.orderRepository.findMany(filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }
}
