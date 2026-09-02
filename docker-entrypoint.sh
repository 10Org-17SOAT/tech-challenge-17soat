#!/bin/sh
# Brings the API up on its own: waits for the database, applies migrations and,
# when explicitly asked, loads demo data. Then hands control to the app.
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

echo "Waiting for ${DB_HOST}:${DB_PORT}..."
i=0
until node -e "
const net = require('node:net');
const s = net.connect(${DB_PORT}, '${DB_HOST}');
s.on('connect', () => { s.end(); process.exit(0); });
s.on('error', () => process.exit(1));
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "Database did not become reachable in 60s." >&2
    exit 1
  fi
  sleep 1
done
echo "Database is reachable."

echo "Applying migrations..."
node dist-scripts/scripts/migrate.js

# Seeding is opt-in and refuses to run under NODE_ENV=production, a guard that
# lives in the seed itself. The demo compose sets both variables on purpose.
if [ "${RUN_SEED}" = "true" ]; then
  echo "Loading demo data..."
  node dist-scripts/scripts/seed.js
fi

exec "$@"
