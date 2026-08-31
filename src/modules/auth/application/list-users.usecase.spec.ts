import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { ListUsersUseCase } from './list-users.usecase';

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email.toLowerCase(),
    ) ?? null;
  }

  async findMany({ page, limit }: { page: number; limit: number }) {
    const items = Array.from(this.users.values()).slice(
      (page - 1) * limit,
      page * limit,
    );

    return { items, total: this.users.size };
  }

  async save(user: User): Promise<void> {
    this.users.set(user.user_id, user);
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}

describe('ListUsersUseCase', () => {
  let repository: InMemoryUserRepository;
  let useCase: ListUsersUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new ListUsersUseCase(repository);
  });

  it('returns a paginated list of users', async () => {
    const first = User.create({
      name: 'Ana Souza',
      email: 'ana@email.com',
      password_hash: 'hash1',
      role_id: 1,
    });
    const second = User.create({
      name: 'Bruno Costa',
      email: 'bruno@email.com',
      password_hash: 'hash2',
      role_id: 2,
    });

    await repository.save(first);
    await repository.save(second);

    const result = await useCase.execute({ page: 1, limit: 1 });

    expect(result.total).toBe(2);
    expect(result.page).toBeUndefined();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].email).toBe('ana@email.com');
  });
});
