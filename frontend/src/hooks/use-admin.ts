import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Query } from "@/lib/api";
import type {
  AlgorithmSettings,
  Alerts,
  AuditLog,
  Dashboard,
  Paginated,
  ReportInfo,
  ReportResult,
  Species,
  Vaccine,
} from "@/lib/types";

// ---------- Panel y alertas (CU18, CU23) ----------

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/dashboard") });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => api<Alerts>("/alerts"),
    refetchInterval: 5 * 60_000,
  });
}

// ---------- Reportes (CU17) ----------

export function useReportList() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => api<ReportInfo[]>("/reports"),
    staleTime: Infinity,
  });
}

export function useReport(type: string | null, filters: Query) {
  return useQuery({
    queryKey: ["report", type, filters],
    queryFn: () => api<ReportResult>(`/reports/${type}`, { query: filters }),
    enabled: !!type,
    placeholderData: keepPreviousData,
  });
}

// ---------- Auditoría (CU19) ----------

export function useAudit(filters: Query) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: () => api<Paginated<AuditLog>>("/audit", { query: filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAuditFacets() {
  return useQuery({
    queryKey: ["audit-facets"],
    queryFn: () => api<{ actions: string[]; entities: string[] }>("/audit/facets"),
  });
}

// ---------- Catálogos (CU16) ----------

export function useAlgorithmSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      api<{ current: AlgorithmSettings; history: AlgorithmSettings[] }>("/algorithm-settings"),
  });
}

export function useCatalogMutations() {
  const qc = useQueryClient();
  return {
    createVaccine: useMutation({
      mutationFn: (input: {
        name: string;
        species: Species[];
        isRabies: boolean;
        isActive: boolean;
      }) => api<Vaccine>("/vaccines", { method: "POST", body: input }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["vaccines"] }),
    }),
    updateVaccine: useMutation({
      mutationFn: ({ id, ...input }: Partial<Vaccine> & { id: string }) =>
        api<Vaccine>(`/vaccines/${id}`, { method: "PATCH", body: input }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["vaccines"] }),
    }),
    createSettings: useMutation({
      mutationFn: (
        input: Pick<AlgorithmSettings, "weights" | "thresholdHigh" | "thresholdMedium">,
      ) => api<AlgorithmSettings>("/algorithm-settings", { method: "POST", body: input }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
    }),
  };
}
