import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().min(1).default('postgres'),
  DB_NAME: z.string().min(1).default('tech_challenge'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).default('1h'),
});

export type Env = z.infer<typeof envSchema>;
