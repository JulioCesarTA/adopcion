import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Dashboard, KpisResult, Species, Vaccine } from "@/lib/types";

// ---------- Panel (CU18) ----------

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/dashboard") });
}

// ---------- Indicadores de gestión ----------

export function useKpis(months = 6) {
  return useQuery({
    queryKey: ["kpis", months],
    queryFn: () => api<KpisResult>("/kpis", { query: { months } }),
  });
}

// ---------- Catálogo de vacunas ----------

export function useCatalogMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["vaccines"] });
  return {
    createVaccine: useMutation({
      mutationFn: (input: {
        name: string;
        species: Species[];
        isRabies: boolean;
        isActive: boolean;
      }) => api<Vaccine>("/vaccines", { method: "POST", body: input }),
      onSuccess: invalidate,
    }),
    updateVaccine: useMutation({
      mutationFn: ({ id, ...input }: Partial<Vaccine> & { id: string }) =>
        api<Vaccine>(`/vaccines/${id}`, { method: "PATCH", body: input }),
      onSuccess: invalidate,
    }),
  };
}
