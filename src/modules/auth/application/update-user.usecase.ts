import { Inject, Injectable } from '@nestjs/common';
import {
  UserEmailAlreadyExistsError,
  UserNotFoundError,
} from '../domain/errors/user-errors';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  async execute(
    id: string,
    input: {
      name?: string;
      email?: string;
      password_hash?: string;
      role_id?: number;
    },
  ) {
    const user = await this.repository.findById(id);
    if (!user) throw new UserNotFoundError(id);

    user.update(input);

    if (input.email !== undefined) {
      const existing = await this.repository.findByEmail(user.email);
      if (existing && existing.user_id !== user.user_id)
        throw new UserEmailAlreadyExistsError(user.email);
    }

    await this.repository.save(user);
    return user;
  }
}
