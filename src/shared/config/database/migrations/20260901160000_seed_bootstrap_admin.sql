-- Bootstrap admin. Every route now requires authentication, and creating a
-- user requires role ADMIN (role_id = 1), so the very first admin cannot be
-- created through the API. Seeded here instead of by a manual query.
--
-- Password: ChangeMe@123 (bcrypt, cost 10). Rotate it on first login.
--
-- Guarded by NOT EXISTS rather than ON CONFLICT: `users.email` carries no
-- unique index, so re-running this must not create a second admin.
INSERT INTO "users" ("user_id", "name", "email", "password_hash", "role_id")
SELECT gen_random_uuid(), 'Administrador', 'admin@techchallenge.local', '$2b$10$.YLNFLsjJ9a9biUy2VxEne0mBQo15BDLUkrrQq1ydpUsxQk.sx/ZO', 1
WHERE NOT EXISTS (
  SELECT 1 FROM "users" WHERE "email" = 'admin@techchallenge.local'
);
