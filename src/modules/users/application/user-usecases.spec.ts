import { UserEmailAlreadyExistsError, UserNotFoundError } from '../domain/errors/user-errors';
import { User } from '../domain/user.entity';
import { CreateUserUseCase } from './create-user.usecase';
import { DeleteUserUseCase } from './delete-user.usecase';
import { GetUserUseCase } from './get-user.usecase';
import { ListUsersUseCase } from './list-users.usecase';
import { UpdateUserUseCase } from './update-user.usecase';
import type { UserRepository } from '../domain/user.repository';

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

describe('User use cases', () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  it('creates a user with the required fields', async () => {
    const useCase = new CreateUserUseCase(repository);

    const user = await useCase.execute({
      name: 'Maria Silva',
      email: 'maria@email.com',
      password_hash: 'hashed_password_123',
      role_id: 2,
    });

    expect(user.user_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(user.name).toBe('Maria Silva');
    expect(user.email).toBe('maria@email.com');
    expect(user.password_hash).toBe('hashed_password_123');
    expect(user.role_id).toBe(2);
  });

  it('rejects duplicate email', async () => {
    const useCase = new CreateUserUseCase(repository);

    await useCase.execute({
      name: 'Maria Silva',
      email: 'maria@email.com',
      password_hash: 'hash1',
      role_id: 1,
    });

    await expect(
      useCase.execute({
        name: 'Maria Souza',
        email: 'maria@email.com',
        password_hash: 'hash2',
        role_id: 2,
      }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);
  });

  it('gets a user by id', async () => {
    const useCase = new GetUserUseCase(repository);
    const user = User.create({
      name: 'João',
      email: 'joao@email.com',
      password_hash: 'hash',
      role_id: 1,
    });
    await repository.save(user);

    await expect(useCase.execute(user.user_id)).resolves.toEqual(user);
  });

  it('lists users with pagination', async () => {
    const useCase = new ListUsersUseCase(repository);
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

    await expect(useCase.execute({ page: 1, limit: 1 })).resolves.toMatchObject({
      total: 2,
      items: [expect.objectContaining({ email: 'ana@email.com' })],
    });
  });

  it('updates user fields', async () => {
    const useCase = new UpdateUserUseCase(repository);
    const user = User.create({
      name: 'Carlos',
      email: 'carlos@email.com',
      password_hash: 'old_hash',
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
    expect(updated.password_hash).toBe('old_hash');
  });

  it('throws when update target is not found', async () => {
    const useCase = new UpdateUserUseCase(repository);

    await expect(
      useCase.execute('missing-id', { name: 'Inexistente' }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('deletes a user', async () => {
    const useCase = new DeleteUserUseCase(repository);
    const user = User.create({
      name: 'Delete',
      email: 'delete@email.com',
      password_hash: 'hash',
      role_id: 1,
    });
    await repository.save(user);

    await expect(useCase.execute(user.user_id)).resolves.toBeUndefined();
    await expect(repository.findById(user.user_id)).resolves.toBeNull();
  });
});
