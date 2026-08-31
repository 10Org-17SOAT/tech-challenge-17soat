import { Service } from './service.entity';

/** One line of a service's bill of materials. */
export interface ServiceSupply {
  supplyId: string;
  quantity: number;
}

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
  findManyByIds(ids: string[]): Promise<Service[]>;
  findByName(name: string): Promise<Service | null>;
  findMany(pagination: Pagination): Promise<PaginatedServices>;
  save(service: Service): Promise<void>;
  // Bills of materials for several services at once — a quotation needs every
  // service's parts, and one query per service would be an N+1.
  findSuppliesFor(serviceIds: string[]): Promise<Map<string, ServiceSupply[]>>;
  replaceSupplies(serviceId: string, supplies: ServiceSupply[]): Promise<void>;
}

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');
