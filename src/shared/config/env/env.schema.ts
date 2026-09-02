import { z } from 'zod';

const emptyAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

export const envSchema = z
  .object({
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

    // Creating a user is an ADMIN route, so the first administrator cannot come
    // through the API. Supply both to have one created on boot; leave them out
    // and nothing is created. Never hardcode these — a committed credential is
    // a known credential.
    // An empty value in .env is the same as an absent one: a placeholder left
    // blank must not fail validation.
    BOOTSTRAP_ADMIN_EMAIL: emptyAsUndefined(z.email().optional()),
    BOOTSTRAP_ADMIN_PASSWORD: emptyAsUndefined(z.string().min(12).optional()),

    // Where the approval link in the email points. It cannot be derived from the
    // incoming request: the email is composed by a background call that has no
    // request, and Host headers are caller-controlled anyway.
    APP_BASE_URL: z.url().default('http://localhost:3000'),

    // `log` writes the message to the Nest logger and sends nothing. It is the
    // default so that a fresh clone and `npm run test:e2e` never reach a provider.
    MAIL_DRIVER: z.enum(['log', 'brevo']).default('log'),
    MAIL_FROM: z.email().default('oficina@example.com'),
    MAIL_FROM_NAME: z.string().min(1).default('Oficina'),
    BREVO_API_KEY: z.string().min(1).optional(),
  })
  .refine((env) => env.MAIL_DRIVER !== 'brevo' || Boolean(env.BREVO_API_KEY), {
    message: 'BREVO_API_KEY is required when MAIL_DRIVER is "brevo"',
    path: ['BREVO_API_KEY'],
  })
  .refine(
    (env) =>
      Boolean(env.BOOTSTRAP_ADMIN_EMAIL) ===
      Boolean(env.BOOTSTRAP_ADMIN_PASSWORD),
    {
      message:
        'BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be set together',
      path: ['BOOTSTRAP_ADMIN_PASSWORD'],
    },
  );

export type Env = z.infer<typeof envSchema>;
