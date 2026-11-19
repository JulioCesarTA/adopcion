-- El sistema queda con cuatro roles: ADMIN, VETERINARIO, CLIENTE y ADOPTANTE.
-- GESTION y DIRECTIVO ya no tienen usuarios; sus funciones las asume el ADMIN.
UPDATE "users" SET "role" = 'ADMIN' WHERE "role" IN ('GESTION', 'DIRECTIVO');

ALTER TYPE "user_role" RENAME TO "user_role_old";
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'VETERINARIO', 'CLIENTE', 'ADOPTANTE');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role" USING ("role"::text::"user_role");
DROP TYPE "user_role_old";
