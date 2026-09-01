import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(255),
});

export class LoginRequestDto extends createZodDto(loginRequestSchema) {}

export const authUserSchema = z.object({
  user_id: z.uuid(),
  email: z.email(),
  name: z.string(),
  role_id: z.number().int(),
});

export class AuthUserDto extends createZodDto(authUserSchema) {}

export const loginResponseSchema = z.object({
  access_token: z.string(),
  user: authUserSchema,
});

export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
