import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Consultation,
  Diagnosis,
  Medication,
  PeriodStatus,
  PeriodType,
  QuarantineControl,
  QuarantinePeriod,
  Treatment,
  TreatmentStatus,
  Vaccination,
  Vaccine,
} from "@/lib/types";
import { invalidateAnimal } from "./use-animals";

export function useConsultations(animalId: string) {
  return useQuery({
    queryKey: ["consultations", animalId],
    queryFn: () => api<Consultation[]>(`/animals/${animalId}/consultations`),
  });
}

export function useConsultation(id: string) {
  return useQuery({
    queryKey: ["consultation", id],
    queryFn: () => api<Consultation>(`/consultations/${id}`),
  });
}

export function useVaccinations(animalId: string) {
  return useQuery({
    queryKey: ["vaccinations", animalId],
    queryFn: () => api<Vaccination[]>(`/animals/${animalId}/vaccinations`),
  });
}

export function usePeriods(animalId: string) {
  return useQuery({
    queryKey: ["periods", animalId],
    queryFn: () => api<QuarantinePeriod[]>(`/animals/${animalId}/periods`),
  });
}

export function useAllPeriods(status?: PeriodStatus) {
  return useQuery({
    queryKey: ["periods-all", status],
    queryFn: () => api<QuarantinePeriod[]>("/periods", { query: { status } }),
  });
}

export interface UpcomingVaccination {
  id: string;
  animal_id: string;
  animal_code: string;
  animal_name: string | null;
  species: string;
  vaccine_id: string;
  vaccine_name: string;
  application_date: string;
  next_dose_date: string;
}

export function useUpcomingVaccinations(days: number) {
  return useQuery({
    queryKey: ["upcoming", days],
    queryFn: () => api<UpcomingVaccination[]>("/vaccinations/upcoming", { query: { days } }),
  });
}

export function useVaccines(active?: boolean) {
  return useQuery({
    queryKey: ["vaccines", active],
    queryFn: () => api<Vaccine[]>("/vaccines", { query: { active } }),
    staleTime: 5 * 60_000,
  });
}

export interface ConsultationInput {
  consultationDate: string;
  reason: string;
  weightKg?: number;
  temperatureC?: number;
  clinicalEvaluation: string;
  observations?: string;
}

export interface MedicationInput {
  name: string;
  dose: string;
  administrationRoute: string;
  frequency: string;
  duration: string;
  observations?: string;
}

export interface TreatmentInput {
  description: string;
  instructions: string;
  startDate: string;
  endDate?: string;
  observations?: string;
  medications?: MedicationInput[];
}

export interface VaccinationInput {
  vaccineId: string;
  applicationDate: string;
  dose: string;
  batchNumber?: string;
  nextDoseDate?: string;
  observations?: string;
}

/** Mutaciones del HCD; `animalId` permite invalidar la ficha y la línea de tiempo. */
export function useClinicalMutations(animalId: string) {
  const qc = useQueryClient();
  const done = () => invalidateAnimal(qc, animalId);
  const doneConsultation = (id: string) => {
    void qc.invalidateQueries({ queryKey: ["consultation", id] });
    done();
  };

  return {
    createConsultation: useMutation({
      mutationFn: (input: ConsultationInput) =>
        api<Consultation>(`/animals/${animalId}/consultations`, { method: "POST", body: input }),
      onSuccess: done,
    }),
    updateConsultation: useMutation({
      mutationFn: ({ id, ...input }: Partial<ConsultationInput> & { id: string }) =>
        api<Consultation>(`/consultations/${id}`, { method: "PATCH", body: input }),
      onSuccess: (c) => doneConsultation(c.id),
    }),
    addDiagnosis: useMutation({
      mutationFn: ({
        consultationId,
        ...input
      }: {
        consultationId: string;
        description: string;
        observations?: string;
      }) =>
        api<Diagnosis>(`/consultations/${consultationId}/diagnoses`, {
          method: "POST",
          body: input,
        }),
      onSuccess: (_d, v) => doneConsultation(v.consultationId),
    }),
    addTreatment: useMutation({
      mutationFn: ({ consultationId, ...input }: TreatmentInput & { consultationId: string }) =>
        api<Treatment>(`/consultations/${consultationId}/treatments`, {
          method: "POST",
          body: input,
        }),
      onSuccess: (t) => doneConsultation(t.consultationId),
    }),
    updateTreatment: useMutation({
      mutationFn: ({
        id,
        ...input
      }: Partial<TreatmentInput> & { id: string; status?: TreatmentStatus }) =>
        api<Treatment>(`/treatments/${id}`, { method: "PATCH", body: input }),
      onSuccess: (t) => doneConsultation(t.consultationId),
    }),
    addMedication: useMutation({
      mutationFn: ({
        treatmentId,
        ...input
      }: MedicationInput & { treatmentId: string; consultationId: string }) =>
        api<Medication>(`/treatments/${treatmentId}/medications`, {
          method: "POST",
          body: { ...input, consultationId: undefined },
        }),
      onSuccess: (_m, v) => doneConsultation(v.consultationId),
    }),
    createVaccination: useMutation({
      mutationFn: (input: VaccinationInput) =>
        api<Vaccination>(`/animals/${animalId}/vaccinations`, { method: "POST", body: input }),
      onSuccess: done,
    }),
    updateVaccination: useMutation({
      mutationFn: ({ id, ...input }: Partial<VaccinationInput> & { id: string }) =>
        api<Vaccination>(`/vaccinations/${id}`, { method: "PATCH", body: input }),
      onSuccess: done,
    }),
    startPeriod: useMutation({
      mutationFn: (input: {
        type: PeriodType;
        reason: string;
        startDate: string;
        expectedEndDate?: string;
      }) => api<QuarantinePeriod>(`/animals/${animalId}/periods`, { method: "POST", body: input }),
      onSuccess: done,
    }),
    addControl: useMutation({
      mutationFn: ({
        periodId,
        ...input
      }: {
        periodId: string;
        controlDate: string;
        animalCondition: string;
        observations?: string;
      }) =>
        api<QuarantineControl>(`/periods/${periodId}/controls`, { method: "POST", body: input }),
      onSuccess: done,
    }),
    closePeriod: useMutation({
      mutationFn: ({
        periodId,
        ...input
      }: {
        periodId: string;
        endDate: string;
        finalObservations?: string;
        confirmWithoutControls?: boolean;
      }) => api<QuarantinePeriod>(`/periods/${periodId}/close`, { method: "POST", body: input }),
      onSuccess: done,
    }),
  };
}
