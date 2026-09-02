import { Consultant } from '../domain/consultant.entity';
import type {
  ListConsultantsFilter,
  PaginatedConsultants,
  ConsultantRepository,
} from '../domain/consultant.repository';

export class InMemoryConsultantRepository implements ConsultantRepository {
  readonly consultants = new Map<string, Consultant>();

  findById(id: string): Promise<Consultant | null> {
    const consultant = this.consultants.get(id);
    return Promise.resolve(
      consultant && !consultant.deletedAt ? consultant : null,
    );
  }

  findByCpf(cpf: string): Promise<Consultant | null> {
    for (const consultant of this.consultants.values()) {
      if (consultant.cpf === cpf && !consultant.deletedAt) {
        return Promise.resolve(consultant);
      }
    }
    return Promise.resolve(null);
  }

  findMany({
    page,
    limit,
    name,
  }: ListConsultantsFilter): Promise<PaginatedConsultants> {
    const term = name?.toLocaleLowerCase();
    const active = [...this.consultants.values()].filter(
      (c) =>
        !c.deletedAt &&
        (term === undefined || c.name.toLocaleLowerCase().includes(term)),
    );
    return Promise.resolve({
      items: active.slice((page - 1) * limit, page * limit),
      total: active.length,
    });
  }

  save(consultant: Consultant): Promise<void> {
    this.consultants.set(consultant.id, consultant);
    return Promise.resolve();
  }
}
