import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserUseCase } from '../application/create-user.usecase';
import { DeleteUserUseCase } from '../application/delete-user.usecase';
import { GetUserUseCase } from '../application/get-user.usecase';
import { ListUsersUseCase } from '../application/list-users.usecase';
import { UpdateUserUseCase } from '../application/update-user.usecase';
import {
  CreateUserDto,
  ListUsersQueryDto,
  PaginatedUsersResponseDto,
  toUserResponse,
  UpdateUserDto,
  UserIdParamDto,
  UserResponseDto,
} from './dtos/user.dtos';
import { UserErrorsFilter } from './user-errors.filter';

@ApiTags('users')
@Controller('user')
@UseFilters(UserErrorsFilter)
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    return toUserResponse(await this.createUser.execute(body));
  }

  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const result = await this.listUsers.execute(query);

    return {
      items: result.items.map(toUserResponse),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  @Get(':user_id')
  async get(@Param() params: UserIdParamDto): Promise<UserResponseDto> {
    return toUserResponse(await this.getUser.execute(params.user_id));
  }

  @Patch(':user_id')
  async update(
    @Param() params: UserIdParamDto,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return toUserResponse(await this.updateUser.execute(params.user_id, body));
  }

  @Delete(':user_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param() params: UserIdParamDto): Promise<void> {
    await this.deleteUser.execute(params.user_id);
  }
}
