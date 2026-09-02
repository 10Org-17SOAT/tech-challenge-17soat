import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Applies the SQL files shipped in the image. Deliberately does not use
// drizzle-kit: that is a devDependency, absent from the production install.
const MIGRATIONS_FOLDER =
  process.env.MIGRATIONS_FOLDER ?? '/app/migrations';

async function run(): Promise<void> {
  const pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'tech_challenge',
  });

  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
    console.log('Migrations applied.');
  } finally {
    await pool.end();
  }
}

run().catch((error: unknown) => {
  console.error('Migration failed.');
  console.error(error);
  process.exit(1);
});
