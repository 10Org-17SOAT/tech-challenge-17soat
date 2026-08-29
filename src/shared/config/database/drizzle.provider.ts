import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Env } from '@/shared/config/env/env.schema';
import * as schema from '@/shared/config/database/schema';

export type DrizzleDatabase = NodePgDatabase<typeof schema>;

export function createDrizzleConnection(
  configService: ConfigService<Env, true>,
): DrizzleDatabase {
  const pool = new Pool({
    host: configService.get('DB_HOST', { infer: true }),
    port: configService.get('DB_PORT', { infer: true }),
    user: configService.get('DB_USER', { infer: true }),
    password: configService.get('DB_PASSWORD', { infer: true }),
    database: configService.get('DB_NAME', { infer: true }),
  });

  return drizzle(pool, { schema });
}
