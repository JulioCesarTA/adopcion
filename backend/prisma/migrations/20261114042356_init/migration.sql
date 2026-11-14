-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'VETERINARIO', 'GESTION', 'DIRECTIVO');

-- CreateEnum
CREATE TYPE "species" AS ENUM ('PERRO', 'GATO', 'OTRO');

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('MACHO', 'HEMBRA', 'DESCONOCIDO');

-- CreateEnum
CREATE TYPE "animal_size" AS ENUM ('PEQUENO', 'MEDIANO', 'GRANDE');

-- CreateEnum
CREATE TYPE "animal_status" AS ENUM ('INGRESADO', 'EN_OBSERVACION', 'EN_CUARENTENA', 'EN_TRATAMIENTO', 'DISPONIBLE_ADOPCION', 'EN_PROCESO_ADOPCION', 'ADOPTADO', 'FALLECIDO', 'DEVUELTO');

-- CreateEnum
CREATE TYPE "housing_type" AS ENUM ('DEPARTAMENTO', 'CASA_SIN_PATIO', 'CASA_CON_PATIO');

-- CreateEnum
CREATE TYPE "experience_level" AS ENUM ('NINGUNA', 'BASICA', 'AVANZADA');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('PENDIENTE', 'EN_EVALUACION', 'APROBADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "period_type" AS ENUM ('OBSERVACION', 'CUARENTENA');

-- CreateEnum
CREATE TYPE "period_status" AS ENUM ('ACTIVO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "treatment_status" AS ENUM ('ACTIVO', 'FINALIZADO', 'SUSPENDIDO');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "refresh_token_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ci" VARCHAR(20) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "address" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "species" "species" NOT NULL,
    "breed" VARCHAR(100),
    "sex" "sex" NOT NULL DEFAULT 'DESCONOCIDO',
    "age_months" INTEGER,
    "color" VARCHAR(100),
    "size" "animal_size" NOT NULL,
    "energy_level" SMALLINT NOT NULL,
    "temperament" TEXT,
    "good_with_children" BOOLEAN NOT NULL DEFAULT false,
    "good_with_animals" BOOLEAN NOT NULL DEFAULT false,
    "needs_yard" BOOLEAN NOT NULL DEFAULT false,
    "special_care" BOOLEAN NOT NULL DEFAULT false,
    "special_care_notes" TEXT,
    "required_daily_hours" DECIMAL(4,1) NOT NULL DEFAULT 2,
    "physical_description" TEXT,
    "photo_url" VARCHAR(500),
    "entry_date" TIMESTAMPTZ(6) NOT NULL,
    "entry_reason" VARCHAR(255) NOT NULL,
    "status" "animal_status" NOT NULL DEFAULT 'INGRESADO',
    "exit_date" TIMESTAMPTZ(6),
    "exit_reason" VARCHAR(100),
    "exit_notes" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "species" "species"[],
    "is_rabies" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "vaccine_id" UUID NOT NULL,
    "application_date" DATE NOT NULL,
    "dose" VARCHAR(50) NOT NULL,
    "batch_number" VARCHAR(50),
    "next_dose_date" DATE,
    "observations" TEXT,
    "applied_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veterinary_consultations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "veterinarian_id" UUID NOT NULL,
    "consultation_date" TIMESTAMPTZ(6) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "weight_kg" DECIMAL(6,2),
    "temperature_c" DECIMAL(4,1),
    "clinical_evaluation" TEXT NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veterinary_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consultation_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consultation_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "treatment_status" NOT NULL DEFAULT 'ACTIVO',
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "treatment_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "dose" VARCHAR(50) NOT NULL,
    "administration_route" VARCHAR(100) NOT NULL,
    "frequency" VARCHAR(100) NOT NULL,
    "duration" VARCHAR(100) NOT NULL,
    "observations" TEXT,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarantine_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "type" "period_type" NOT NULL,
    "reason" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "expected_end_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "status" "period_status" NOT NULL DEFAULT 'ACTIVO',
    "final_observations" TEXT,
    "started_by" UUID NOT NULL,
    "closed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quarantine_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarantine_controls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quarantine_period_id" UUID NOT NULL,
    "control_date" TIMESTAMPTZ(6) NOT NULL,
    "animal_condition" TEXT NOT NULL,
    "observations" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quarantine_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adopter_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "housing_type" "housing_type" NOT NULL,
    "has_yard" BOOLEAN NOT NULL,
    "has_children" BOOLEAN NOT NULL,
    "has_other_animals" BOOLEAN NOT NULL,
    "available_hours_per_day" DECIMAL(4,1) NOT NULL,
    "experience" "experience_level" NOT NULL,
    "preferred_species" "species",
    "preferred_size" "animal_size",
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adopter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoption_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adopter_profile_id" UUID NOT NULL,
    "animal_id" UUID NOT NULL,
    "responsible_user_id" UUID NOT NULL,
    "status" "request_status" NOT NULL DEFAULT 'PENDIENTE',
    "request_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision_date" TIMESTAMPTZ(6),
    "delivery_date" TIMESTAMPTZ(6),
    "evaluation_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibility_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adopter_profile_id" UUID NOT NULL,
    "animal_id" UUID NOT NULL,
    "adoption_request_id" UUID,
    "score" DECIMAL(5,2) NOT NULL,
    "level" VARCHAR(15) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "model_version" INTEGER NOT NULL,
    "generated_by" UUID NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compatibility_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoption_followups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adoption_request_id" UUID NOT NULL,
    "followup_date" TIMESTAMPTZ(6) NOT NULL,
    "animal_condition" TEXT NOT NULL,
    "observations" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algorithm_settings" (
    "version" INTEGER NOT NULL,
    "weights" JSONB NOT NULL,
    "threshold_high" INTEGER NOT NULL DEFAULT 80,
    "threshold_medium" INTEGER NOT NULL DEFAULT 60,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_settings_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_name" VARCHAR(100),
    "entity_id" VARCHAR(64),
    "old_value" JSONB,
    "new_value" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "persons_ci_key" ON "persons"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "animals_code_key" ON "animals"("code");

-- CreateIndex
CREATE INDEX "idx_animals_status" ON "animals"("status");

-- CreateIndex
CREATE INDEX "idx_animals_species" ON "animals"("species");

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_name_key" ON "vaccines"("name");

-- CreateIndex
CREATE INDEX "idx_vacc_animal" ON "vaccinations"("animal_id", "application_date" DESC);

-- CreateIndex
CREATE INDEX "idx_cons_animal" ON "veterinary_consultations"("animal_id", "consultation_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "adopter_profiles_person_id_key" ON "adopter_profiles"("person_id");

-- CreateIndex
CREATE INDEX "idx_reco_pair" ON "compatibility_recommendations"("adopter_profile_id", "animal_id", "generated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_name", "entity_id");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veterinary_consultations" ADD CONSTRAINT "veterinary_consultations_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veterinary_consultations" ADD CONSTRAINT "veterinary_consultations_veterinarian_id_fkey" FOREIGN KEY ("veterinarian_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "veterinary_consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "veterinary_consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_periods" ADD CONSTRAINT "quarantine_periods_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_periods" ADD CONSTRAINT "quarantine_periods_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_periods" ADD CONSTRAINT "quarantine_periods_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_controls" ADD CONSTRAINT "quarantine_controls_quarantine_period_id_fkey" FOREIGN KEY ("quarantine_period_id") REFERENCES "quarantine_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarantine_controls" ADD CONSTRAINT "quarantine_controls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adopter_profiles" ADD CONSTRAINT "adopter_profiles_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_requests" ADD CONSTRAINT "adoption_requests_adopter_profile_id_fkey" FOREIGN KEY ("adopter_profile_id") REFERENCES "adopter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_requests" ADD CONSTRAINT "adoption_requests_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_requests" ADD CONSTRAINT "adoption_requests_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_recommendations" ADD CONSTRAINT "compatibility_recommendations_adopter_profile_id_fkey" FOREIGN KEY ("adopter_profile_id") REFERENCES "adopter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_recommendations" ADD CONSTRAINT "compatibility_recommendations_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_recommendations" ADD CONSTRAINT "compatibility_recommendations_adoption_request_id_fkey" FOREIGN KEY ("adoption_request_id") REFERENCES "adoption_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_recommendations" ADD CONSTRAINT "compatibility_recommendations_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_followups" ADD CONSTRAINT "adoption_followups_adoption_request_id_fkey" FOREIGN KEY ("adoption_request_id") REFERENCES "adoption_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_followups" ADD CONSTRAINT "adoption_followups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "algorithm_settings" ADD CONSTRAINT "algorithm_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Restricciones que Prisma no expresa en schema.prisma (sección 6 de la spec)
-- ===========================================================================

-- CHECKs
ALTER TABLE "animals" ADD CONSTRAINT "chk_animals_age" CHECK (age_months IS NULL OR age_months >= 0);
ALTER TABLE "animals" ADD CONSTRAINT "chk_animals_energy" CHECK (energy_level BETWEEN 1 AND 5);
ALTER TABLE "animals" ADD CONSTRAINT "chk_animals_hours" CHECK (required_daily_hours BETWEEN 0 AND 24);
ALTER TABLE "vaccinations" ADD CONSTRAINT "chk_vacc_next_dose" CHECK (next_dose_date IS NULL OR next_dose_date >= application_date);
ALTER TABLE "veterinary_consultations" ADD CONSTRAINT "chk_cons_weight" CHECK (weight_kg IS NULL OR weight_kg > 0);
ALTER TABLE "veterinary_consultations" ADD CONSTRAINT "chk_cons_temp" CHECK (temperature_c IS NULL OR temperature_c BETWEEN 30 AND 45);
ALTER TABLE "treatments" ADD CONSTRAINT "chk_treat_dates" CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE "adopter_profiles" ADD CONSTRAINT "chk_adopter_hours" CHECK (available_hours_per_day BETWEEN 0 AND 24);
ALTER TABLE "compatibility_recommendations" ADD CONSTRAINT "chk_reco_score" CHECK (score BETWEEN 0 AND 100);

-- Índices de expresión y parciales
CREATE INDEX "idx_animals_name" ON "animals"(lower(name));
CREATE INDEX "idx_vacc_next" ON "vaccinations"(next_dose_date) WHERE next_dose_date IS NOT NULL;

-- Un solo periodo de observación/cuarentena activo por animal
CREATE UNIQUE INDEX "uq_one_active_period" ON "quarantine_periods"(animal_id) WHERE status = 'ACTIVO';

-- RN-05: una sola solicitud activa por animal
CREATE UNIQUE INDEX "uq_one_active_request" ON "adoption_requests"(animal_id)
  WHERE status IN ('PENDIENTE','EN_EVALUACION');

-- La auditoría es de solo lectura (CU19): se impide UPDATE/DELETE a nivel de BD
CREATE OR REPLACE FUNCTION audit_logs_readonly() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs es de solo lectura';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_logs_readonly BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_readonly();
