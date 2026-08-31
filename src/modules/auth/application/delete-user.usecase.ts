import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../domain/errors/user-errors';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) throw new UserNotFoundError(id);

    await this.repository.delete(id);
  }
}
