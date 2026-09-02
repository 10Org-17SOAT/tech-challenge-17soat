import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  execute(pagination: { page: number; limit: number }) {
    return this.repository.findMany(pagination);
  }
}
