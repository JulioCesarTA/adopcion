import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Query } from "@/lib/api";
import type {
  Adopter,
  AdoptionRequest,
  AdoptionRequestBase,
  AdoptionRequestDetail,
  Animal,
  Followup,
  Paginated,
  Ranking,
  Recommendation,
  RequestStatus,
} from "@/lib/types";
import { invalidateAnimal } from "./use-animals";

// ---------- Adoptantes (CU10) ----------

export type AdopterInput = Omit<
  Adopter,
  "id" | "personId" | "person" | "createdAt" | "updatedAt" | "_count" | "adoptionRequests"
> &
  Omit<Adopter["person"], "id">;

export function useAdopters(filters: Query) {
  return useQuery({
    queryKey: ["adopters", filters],
    queryFn: () => api<Paginated<Adopter>>("/adopters", { query: filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAdopter(id: string) {
  return useQuery({
    queryKey: ["adopter", id],
    queryFn: () => api<Adopter>(`/adopters/${id}`),
    enabled: !!id,
  });
}

export function useAdopterMutations(id?: string) {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["adopters"] });
    if (id) void qc.invalidateQueries({ queryKey: ["adopter", id] });
  };
  return {
    create: useMutation({
      mutationFn: (input: Partial<AdopterInput>) =>
        api<Adopter>("/adopters", { method: "POST", body: input }),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (input: Partial<AdopterInput>) =>
        api<Adopter>(`/adopters/${id}`, { method: "PATCH", body: input }),
      onSuccess: done,
    }),
  };
}

// ---------- Solicitudes (CU11, 12, 14, 15) ----------

export function useAdoptions(filters: Query) {
  return useQuery({
    queryKey: ["adoptions", filters],
    queryFn: () => api<Paginated<AdoptionRequest>>("/adoptions", { query: filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAdoption(id: string) {
  return useQuery({
    queryKey: ["adoption", id],
    queryFn: () => api<AdoptionRequestDetail>(`/adoptions/${id}`),
  });
}

export interface ActData {
  institution: string;
  actNumber: string;
  request: {
    id: string;
    requestDate: string;
    decisionDate: string | null;
    deliveryDate: string | null;
    responsible: { fullName: string };
  };
  adopter: Adopter["person"] & { profile: Adopter };
  animal: Animal & {
    vaccinations: {
      id: string;
      applicationDate: string;
      dose: string;
      vaccine: { name: string; isRabies: boolean };
    }[];
  };
  commitments: string[];
}

export function useAct(id: string) {
  return useQuery({ queryKey: ["act", id], queryFn: () => api<ActData>(`/adoptions/${id}/act`) });
}

export function useAdoptionMutations(id?: string) {
  const qc = useQueryClient();
  const done = (animalId?: string) => {
    void qc.invalidateQueries({ queryKey: ["adoptions"] });
    void qc.invalidateQueries({ queryKey: ["adopter"] });
    if (id) void qc.invalidateQueries({ queryKey: ["adoption", id] });
    invalidateAnimal(qc, animalId);
  };
  return {
    create: useMutation({
      mutationFn: (input: { adopterId: string; animalId: string; notes?: string }) =>
        api<AdoptionRequestBase>("/adoptions", { method: "POST", body: input }),
      onSuccess: (r) => done(r.animalId),
    }),
    changeStatus: useMutation({
      mutationFn: (input: {
        status: Extract<RequestStatus, "EN_EVALUACION" | "CANCELADA">;
        notes?: string;
      }) => api<AdoptionRequestBase>(`/adoptions/${id}/status`, { method: "PATCH", body: input }),
      onSuccess: (r) => done(r.animalId),
    }),
    addNote: useMutation({
      mutationFn: (notes: string) =>
        api<AdoptionRequestBase>(`/adoptions/${id}/notes`, { method: "POST", body: { notes } }),
      onSuccess: (r) => done(r.animalId),
    }),
    decide: useMutation({
      mutationFn: (input: {
        result: "APROBADA" | "RECHAZADA";
        notes: string;
        decisionDate: string;
        deliveryDate?: string;
      }) => api<AdoptionRequestBase>(`/adoptions/${id}/decision`, { method: "POST", body: input }),
      onSuccess: (r) => done(r.animalId),
    }),
    addFollowup: useMutation({
      mutationFn: (input: {
        followupDate: string;
        animalCondition: string;
        observations?: string;
      }) => api<Followup>(`/adoptions/${id}/followups`, { method: "POST", body: input }),
      onSuccess: () => done(),
    }),
  };
}

// ---------- Recomendación (CU13) ----------

export function useRanking(adopterId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["ranking", adopterId],
    queryFn: () => api<Ranking>(`/recommendations/adopter/${adopterId}`),
    enabled,
    staleTime: 0,
  });
}

export function usePairRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { adopterId: string; animalId: string; requestId?: string }) =>
      api<Recommendation & { animal: Animal }>("/recommendations", { method: "POST", body: input }),
    onSuccess: (_r, v) => {
      if (v.requestId) void qc.invalidateQueries({ queryKey: ["adoption", v.requestId] });
    },
  });
}
