-- CreateEnum
CREATE TYPE "ml_model_source" AS ENUM ('REAL', 'SINTETICO', 'MIXTO');

-- CreateTable
CREATE TABLE "ml_models" (
    "version" INTEGER NOT NULL,
    "algorithm" VARCHAR(40) NOT NULL,
    "source" "ml_model_source" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "model" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "dataset_size" INTEGER NOT NULL,
    "real_samples" INTEGER NOT NULL,
    "synthetic_samples" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_models_pkey" PRIMARY KEY ("version")
);

-- CreateIndex
CREATE INDEX "ml_models_is_active_idx" ON "ml_models"("is_active");

-- AddForeignKey
ALTER TABLE "ml_models" ADD CONSTRAINT "ml_models_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Restricciones que Prisma no expresa (ver DECISIONS.md).
-- ---------------------------------------------------------------------------

-- Solo un modelo puede estar activo a la vez. El índice único parcial lo
-- garantiza en la base, aunque dos peticiones de activación lleguen a la vez.
CREATE UNIQUE INDEX uq_one_active_ml_model
  ON ml_models ((true)) WHERE is_active;

-- La versión arranca en 1 y es creciente.
ALTER TABLE ml_models ADD CONSTRAINT ck_ml_models_version CHECK (version >= 1);

-- Los tamaños del conjunto deben ser coherentes entre sí.
ALTER TABLE ml_models ADD CONSTRAINT ck_ml_models_dataset CHECK (
  real_samples >= 0
  AND synthetic_samples >= 0
  AND dataset_size = real_samples + synthetic_samples
  AND dataset_size > 0
);
