import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Applies the SQL files shipped in the image. Deliberately does not use
// drizzle-kit: that is a devDependency, absent from the production install.
const MIGRATIONS_FOLDER =
  process.env.MIGRATIONS_FOLDER ?? '/app/migrations';

// Every pod runs this on boot, and with the HPA several can boot at once. The
// drizzle migrator takes no lock: two runners on a fresh database both see no
// applied migration, and the second one fails on the tables the first created.
// A session-level advisory lock makes them take turns; the later ones find
// everything applied and do nothing. Postgres drops the lock with the
// connection, so a runner that crashes never leaves it held.
const MIGRATION_LOCK_KEY = 106_001;

async function run(): Promise<void> {
  const pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'tech_challenge',
  });

  try {
    // One client for the lock and the migrations: the lock belongs to the
    // session that took it.
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
      await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    } finally {
      client.release();
    }
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
