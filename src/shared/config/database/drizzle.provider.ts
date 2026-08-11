import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export function createDrizzleConnection(configService: ConfigService) {
  const pool = new Pool({
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    user: configService.get<string>('DB_USER', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'tech_challenge'),
  });

  return drizzle(pool, { schema });
}

export type DrizzleDatabase = ReturnType<typeof createDrizzleConnection>;
