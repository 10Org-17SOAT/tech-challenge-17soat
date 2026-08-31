import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { User } from '../../domain/user.entity';

const fields = {
  name: z.string().trim().min(1).max(255),
  email: z.email().max(255),
  password_hash: z.string().min(8).max(255),
  role_id: z.number().int().min(1),
};

export class CreateUserDto extends createZodDto(z.object(fields)) {}

export class UpdateUserDto extends createZodDto(z.object(fields).partial()) {}

export class UserIdParamDto extends createZodDto(z.object({ user_id: z.uuid() })) {}

export class ListUsersQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
) {}

export const userResponseSchema = z.object({
  user_id: z.uuid(),
  name: z.string(),
  email: z.email(),
  password_hash: z.string(),
  role_id: z.number().int(),
});

export class UserResponseDto extends createZodDto(userResponseSchema) {}

export class PaginatedUsersResponseDto extends createZodDto(
  z.object({
    items: z.array(userResponseSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
  }),
) {}

export function toUserResponse(user: User): UserResponseDto {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    password_hash: user.password_hash,
    role_id: user.role_id,
  };
}
