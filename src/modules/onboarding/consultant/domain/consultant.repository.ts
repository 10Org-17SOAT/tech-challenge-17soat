import { Consultant } from './consultant.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface ListConsultantsFilter extends Pagination {
  name?: string;
}

export interface PaginatedConsultants {
  items: Consultant[];
  total: number;
}

export interface ConsultantRepository {
  findById(id: string): Promise<Consultant | null>;
  findByCpf(cpf: string): Promise<Consultant | null>;
  findMany(filter: ListConsultantsFilter): Promise<PaginatedConsultants>;
  save(consultant: Consultant): Promise<void>;
}

export const CONSULTANT_REPOSITORY = Symbol('CONSULTANT_REPOSITORY');
