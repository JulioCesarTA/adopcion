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
  RequestStatus,
} from "@/lib/types";
import { invalidateAnimal } from "./use-animals";

// ---------- Adoptantes (CU10) ----------

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
    changeStatus: useMutation({
      mutationFn: (input: {
        status: Extract<RequestStatus, "EN_EVALUACION" | "CANCELADA">;
        notes?: string;
      }) => api<AdoptionRequestBase>(`/adoptions/${id}/status`, { method: "PATCH", body: input }),
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
