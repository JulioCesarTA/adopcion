-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'ADOPTANTE';

-- AlterTable
ALTER TABLE "animals" ADD COLUMN     "owner_id" UUID;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

