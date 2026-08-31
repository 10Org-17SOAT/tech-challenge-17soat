import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../domain/errors/user-errors';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  async execute(id: string) {
    const user = await this.repository.findById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }
}
