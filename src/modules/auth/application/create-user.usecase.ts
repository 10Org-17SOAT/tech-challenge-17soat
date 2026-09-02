import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserEmailAlreadyExistsError } from '../domain/errors/user-errors';
import { User } from '../domain/user.entity';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  async execute(input: {
    name: string;
    email: string;
    password_hash: string;
    role_id: number;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password_hash, 10);
    const user = User.create({ ...input, password_hash: passwordHash });

    if (await this.repository.findByEmail(user.email)) {
      throw new UserEmailAlreadyExistsError(user.email);
    }

    await this.repository.save(user);
    return user;
  }
}
