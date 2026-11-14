import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api, type Query } from "@/lib/api";
import type { Animal, AnimalDetail, AnimalListItem, Paginated, TimelineItem } from "@/lib/types";

/** Invalida todo lo que depende del estado o del HCD de un animal. */
export function invalidateAnimal(qc: QueryClient, animalId?: string) {
  const keys = [
    "animals",
    "adoptable",
    "alerts",
    "dashboard",
    "periods-all",
    "upcoming",
    "adoptions",
  ];
  keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
  if (animalId) {
    ["animal", "timeline", "consultations", "vaccinations", "periods"].forEach(
      (k) => void qc.invalidateQueries({ queryKey: [k, animalId] }),
    );
  }
}

export function useAnimals(filters: Query) {
  return useQuery({
    queryKey: ["animals", filters],
    queryFn: () => api<Paginated<AnimalListItem>>("/animals", { query: filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAdoptable(filters: Query) {
  return useQuery({
    queryKey: ["adoptable", filters],
    queryFn: () => api<Paginated<AnimalListItem>>("/animals/adoptable", { query: filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAnimal(id: string) {
  return useQuery({
    queryKey: ["animal", id],
    queryFn: () => api<AnimalDetail>(`/animals/${id}`),
    enabled: !!id,
  });
}

export function useTimeline(id: string, filters: Query) {
  return useQuery({
    queryKey: ["timeline", id, filters],
    queryFn: () => api<{ data: TimelineItem[] }>(`/animals/${id}/timeline`, { query: filters }),
    placeholderData: keepPreviousData,
  });
}

export type AnimalInput = Omit<
  Animal,
  | "id"
  | "code"
  | "status"
  | "photoUrl"
  | "exitDate"
  | "exitReason"
  | "createdAt"
  | "updatedAt"
  | "exitNotes"
> & { exitNotes?: string | null };

export function useAnimalMutations(id?: string) {
  const qc = useQueryClient();
  const done = (animalId?: string) => invalidateAnimal(qc, animalId ?? id);
  const post = (path: string, body?: unknown) =>
    api<Animal>(`/animals/${id}${path}`, { method: "POST", body: body ?? {} });

  return {
    create: useMutation({
      mutationFn: (input: Partial<AnimalInput>) =>
        api<Animal>("/animals", { method: "POST", body: input }),
      onSuccess: (a) => done(a.id),
    }),
    update: useMutation({
      mutationFn: (input: Partial<AnimalInput>) =>
        api<Animal>(`/animals/${id}`, { method: "PATCH", body: input }),
      onSuccess: () => done(),
    }),
    uploadPhoto: useMutation({
      mutationFn: ({ animalId, file }: { animalId: string; file: File }) => {
        const fd = new FormData();
        fd.append("file", file);
        return api<Animal>(`/animals/${animalId}/photo`, { method: "POST", body: fd });
      },
      onSuccess: (a) => done(a.id),
    }),
    enableAdoption: useMutation({
      mutationFn: () => post("/enable-adoption"),
      onSuccess: () => done(),
    }),
    disableAdoption: useMutation({
      mutationFn: () => post("/disable-adoption"),
      onSuccess: () => done(),
    }),
    exit: useMutation({
      mutationFn: (body: {
        type: "FALLECIDO" | "DEVUELTO" | "OTRO";
        detail?: string;
        date: string;
        notes?: string;
      }) => post("/exit", body),
      onSuccess: () => done(),
    }),
    readmit: useMutation({
      mutationFn: (body: { date: string; reason: string }) => post("/readmit", body),
      onSuccess: () => done(),
    }),
  };
}
