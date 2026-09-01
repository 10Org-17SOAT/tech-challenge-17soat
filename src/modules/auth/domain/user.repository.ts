import { User } from './user.entity';

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(pagination: Pagination): Promise<PaginatedUsers>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
