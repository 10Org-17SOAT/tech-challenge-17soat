import { z } from 'zod';

/**
 * `DB_SSL` as the `ssl` option of a `pg` Pool. Shared by the API (through the
 * env schema) and by the migrate and seed scripts, which read `process.env`
 * directly, so the three connections can never disagree.
 *
 * `true` makes `pg` verify the server certificate and hostname against Node's
 * trust store. A private CA, such as Amazon RDS's, is added to that store with
 * NODE_EXTRA_CA_CERTS instead of being read here.
 *
 * Off by default: docker-compose and the local cluster run a Postgres without
 * TLS. Only the literal strings are accepted, because a boolean coercion would
 * read "false" or "0" as true.
 */
export const dbSslSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
);
