import { Service } from '../domain/service.entity';
import {
  PaginatedServices,
  Pagination,
  ServiceRepository,
  ServiceSupply,
} from '../domain/service.repository';

export class InMemoryServiceRepository implements ServiceRepository {
  readonly services = new Map<string, Service>();
  readonly supplies = new Map<string, ServiceSupply[]>();

  findById(id: string): Promise<Service | null> {
    const service = this.services.get(id);
    return Promise.resolve(service && !service.deletedAt ? service : null);
  }

  findByName(name: string): Promise<Service | null> {
    for (const service of this.services.values()) {
      if (service.name === name && !service.deletedAt) {
        return Promise.resolve(service);
      }
    }
    return Promise.resolve(null);
  }

  findMany({ page, limit }: Pagination): Promise<PaginatedServices> {
    const active = [...this.services.values()].filter((s) => !s.deletedAt);
    return Promise.resolve({
      items: active.slice((page - 1) * limit, page * limit),
      total: active.length,
    });
  }

  save(service: Service): Promise<void> {
    this.services.set(service.id, service);
    return Promise.resolve();
  }

  findManyByIds(ids: string[]): Promise<Service[]> {
    const wanted = new Set(ids);
    return Promise.resolve(
      [...this.services.values()].filter(
        (service) => wanted.has(service.id) && !service.deletedAt,
      ),
    );
  }

  findSuppliesFor(serviceIds: string[]): Promise<Map<string, ServiceSupply[]>> {
    return Promise.resolve(
      new Map(
        serviceIds.map((serviceId) => [
          serviceId,
          this.supplies.get(serviceId) ?? [],
        ]),
      ),
    );
  }

  replaceSupplies(serviceId: string, supplies: ServiceSupply[]): Promise<void> {
    this.supplies.set(serviceId, [...supplies]);
    return Promise.resolve();
  }
}
