import { UserEmailAlreadyExistsError } from '../domain/errors/user-errors';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { CreateUserUseCase } from './create-user.usecase';

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

describe('CreateUserUseCase', () => {
  let repository: InMemoryUserRepository;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new CreateUserUseCase(repository);
  });

  it('creates a user and persists it', async () => {
    const user = await useCase.execute({
      name: 'Maria Silva',
      email: 'maria@email.com',
      password_hash: '12345678',
      role_id: 2,
    });

    await expect(repository.findById(user.user_id)).resolves.toBe(user);
    expect(user.email).toBe('maria@email.com');
    expect(user.password_hash).not.toBe('12345678');
  });

  it('rejects a duplicate email', async () => {
    await useCase.execute({
      name: 'Maria Silva',
      email: 'maria@email.com',
      password_hash: '12345678',
      role_id: 2,
    });

    await expect(
      useCase.execute({
        name: 'Maria Souza',
        email: 'maria@email.com',
        password_hash: '87654321',
        role_id: 1,
      }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);
  });
});
