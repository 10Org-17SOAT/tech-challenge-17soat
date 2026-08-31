import {
  UserEmailAlreadyExistsError,
  UserNotFoundError,
} from '../domain/errors/user-errors';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { UpdateUserUseCase } from './update-user.usecase';

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

describe('UpdateUserUseCase', () => {
  let repository: InMemoryUserRepository;
  let useCase: UpdateUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new UpdateUserUseCase(repository);
  });

  it('updates only the provided fields', async () => {
    const user = User.create({
      name: 'Carlos',
      email: 'carlos@email.com',
      password_hash: 'oldhash',
      role_id: 1,
    });
    await repository.save(user);

    const updated = await useCase.execute(user.user_id, {
      name: 'Carlos Nova',
      role_id: 3,
    });

    expect(updated.name).toBe('Carlos Nova');
    expect(updated.role_id).toBe(3);
    expect(updated.email).toBe('carlos@email.com');
  });

  it('throws when the user does not exist', async () => {
    await expect(
      useCase.execute('missing-id', { name: 'Inexistente' }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('rejects email already used by another user', async () => {
    const first = User.create({
      name: 'Ana',
      email: 'ana@email.com',
      password_hash: 'hash1',
      role_id: 1,
    });
    const second = User.create({
      name: 'Bruno',
      email: 'bruno@email.com',
      password_hash: 'hash2',
      role_id: 2,
    });

    await repository.save(first);
    await repository.save(second);

    await expect(
      useCase.execute(second.user_id, { email: 'ana@email.com' }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);
  });
});
