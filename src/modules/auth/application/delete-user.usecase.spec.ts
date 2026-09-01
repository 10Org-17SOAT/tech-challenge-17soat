import { UserNotFoundError } from '../domain/errors/user-errors';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { DeleteUserUseCase } from './delete-user.usecase';

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

describe('DeleteUserUseCase', () => {
  let repository: InMemoryUserRepository;
  let useCase: DeleteUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new DeleteUserUseCase(repository);
  });

  it('deletes an existing user', async () => {
    const user = User.create({
      name: 'Delete Me',
      email: 'delete@email.com',
      password_hash: 'hash123',
      role_id: 1,
    });
    await repository.save(user);

    await expect(useCase.execute(user.user_id)).resolves.toBeUndefined();
    await expect(repository.findById(user.user_id)).resolves.toBeNull();
  });

  it('throws when the user does not exist', async () => {
    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});
