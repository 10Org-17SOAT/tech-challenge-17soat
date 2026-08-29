import { Service } from '@/modules/service-order/services/domain/service.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedServices {
  items: Service[];
  total: number;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
  findByName(name: string): Promise<Service | null>;
  findMany(pagination: Pagination): Promise<PaginatedServices>;
  save(service: Service): Promise<void>;
}

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');
