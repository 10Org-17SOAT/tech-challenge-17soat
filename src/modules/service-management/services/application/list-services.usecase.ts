import { Inject, Injectable } from '@nestjs/common';
import { Service } from '../domain/service.entity';
import { SERVICE_REPOSITORY } from '../domain/service.repository';
import type {
  Pagination,
  ServiceRepository,
} from '../domain/service.repository';

export interface ListServicesOutput {
  items: Service[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListServicesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(pagination: Pagination): Promise<ListServicesOutput> {
    const { items, total } = await this.serviceRepository.findMany(pagination);
    return { items, total, ...pagination };
  }
}
