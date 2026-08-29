import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { PersonType } from '@/modules/onboarding/customer/domain/value-objects/person-type.enum';

export interface FindAllFilters {
  personType?: PersonType;
  name?: string;
  document?: string;
  email?: string;
}

export interface FindAllParams {
  page: number;
  limit: number;
  filters?: FindAllFilters;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerRepository {
  save(customer: Customer): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByDocument(document: string): Promise<Customer | null>;
  findAll(params: FindAllParams): Promise<PaginatedResult<Customer>>;
  delete(id: string): Promise<void>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
