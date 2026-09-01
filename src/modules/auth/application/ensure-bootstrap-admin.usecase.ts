import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/config/env/env.schema';
import { UserRole } from '../roles/role.enum';
import { CreateUserUseCase } from './create-user.usecase';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';

/**
 * Creating a user is an ADMIN route, so the first administrator cannot come
 * through the API. It is created on boot from the environment instead of being
 * seeded by a migration: a password hash committed to the repository is a
 * password everyone knows, however loudly the README says to rotate it.
 *
 * Idempotent and opt-in — it does nothing when the credentials are absent or
 * the account already exists, so restarts and redeploys are safe.
 */
@Injectable()
export class EnsureBootstrapAdminUseCase {
  private readonly logger = new Logger(EnsureBootstrapAdminUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
    private readonly createUser: CreateUserUseCase,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async execute(): Promise<void> {
    const email = this.config.get('BOOTSTRAP_ADMIN_EMAIL', { infer: true });
    const password = this.config.get('BOOTSTRAP_ADMIN_PASSWORD', {
      infer: true,
    });

    if (!email || !password) {
      return;
    }

    if (await this.repository.findByEmail(email)) {
      return;
    }

    await this.createUser.execute({
      name: 'Administrador',
      email,
      password_hash: password,
      role_id: UserRole.ADMIN,
    });

    this.logger.log(`Bootstrap administrator created for ${email}`);
  }
}
