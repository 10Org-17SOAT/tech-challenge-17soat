import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/config/env/env.schema';
import { User } from '../domain/user.entity';
import type { UserRepository } from '../domain/user.repository';
import { UserRole } from '../roles/role.enum';
import { CreateUserUseCase } from './create-user.usecase';
import { EnsureBootstrapAdminUseCase } from './ensure-bootstrap-admin.usecase';

describe('EnsureBootstrapAdminUseCase', () => {
  const makeRepository = (existing: User | null): UserRepository => ({
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(existing),
    findMany: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  });

  const makeConfig = (env: Partial<Env>): ConfigService<Env, true> =>
    ({
      get: (key: keyof Env) => env[key],
    }) as unknown as ConfigService<Env, true>;

  // The mock function is kept alongside the double so assertions reference it
  // directly, instead of pulling an unbound method off the object.
  const makeCreateUser = () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    return { execute, useCase: { execute } as unknown as CreateUserUseCase };
  };

  it('creates the administrator from the environment', async () => {
    const { execute, useCase: createUser } = makeCreateUser();
    const useCase = new EnsureBootstrapAdminUseCase(
      makeRepository(null),
      createUser,
      makeConfig({
        BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
        BOOTSTRAP_ADMIN_PASSWORD: 'a-strong-password',
      }),
    );

    await useCase.execute();

    expect(execute).toHaveBeenCalledWith({
      name: 'Administrador',
      email: 'admin@example.com',
      password_hash: 'a-strong-password',
      role_id: UserRole.ADMIN,
    });
  });

  // Opt-in: a deployment that does not want an account created must not get
  // one, and there is no fallback credential to fall back to.
  it('does nothing when the credentials are absent', async () => {
    const { execute, useCase: createUser } = makeCreateUser();
    const useCase = new EnsureBootstrapAdminUseCase(
      makeRepository(null),
      createUser,
      makeConfig({}),
    );

    await useCase.execute();

    expect(execute).not.toHaveBeenCalled();
  });

  // Runs on every boot, so a restart must not fail or duplicate the account.
  it('does nothing when the administrator already exists', async () => {
    const { execute, useCase: createUser } = makeCreateUser();
    const existing = User.create({
      name: 'Administrador',
      email: 'admin@example.com',
      password_hash: 'already-hashed-value',
      role_id: UserRole.ADMIN,
    });
    const useCase = new EnsureBootstrapAdminUseCase(
      makeRepository(existing),
      createUser,
      makeConfig({
        BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
        BOOTSTRAP_ADMIN_PASSWORD: 'a-strong-password',
      }),
    );

    await useCase.execute();

    expect(execute).not.toHaveBeenCalled();
  });
});
