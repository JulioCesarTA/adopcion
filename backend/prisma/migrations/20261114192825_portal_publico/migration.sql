-- CreateEnum
CREATE TYPE "contact_status" AS ENUM ('NUEVO', 'LEIDO', 'RESPONDIDO');

-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'CLIENTE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" VARCHAR(30),
ADD COLUMN     "terms_accepted_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "subject" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "privacy_accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "contact_status" NOT NULL DEFAULT 'NUEVO',
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_error" VARCHAR(500),
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_contact_status" ON "contact_messages"("status", "created_at" DESC);
