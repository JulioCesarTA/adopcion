import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AnimalListItem,
  AnimalSize,
  ExperienceLevel,
  HousingType,
  Level,
  Species,
} from "@/lib/types";

/** Datos del hogar que el adoptante completa en su portal. */
export interface MyAdopterProfile {
  housingType: HousingType;
  hasYard: boolean;
  hasChildren: boolean;
  hasOtherAnimals: boolean;
  availableHoursPerDay: number;
  experience: ExperienceLevel;
  preferredSpecies: Species | null;
  preferredSize: AnimalSize | null;
}

export interface MyRecommendation {
  animal: AnimalListItem;
  score: number;
  level: Level;
  reasons: string[];
}

export interface MyRecommendations {
  method: "MODELO" | "REGLAS";
  disclaimer: string;
  data: MyRecommendation[];
}

export function useMyAdopterProfile(enabled: boolean) {
  return useQuery({
    queryKey: ["my-adopter-profile"],
    // Sin perfil el API responde vacío: React Query no admite `undefined`, se normaliza a null.
    queryFn: async () => (await api<MyAdopterProfile | null>("/adopters/mine")) ?? null,
    enabled,
  });
}

export function useSaveMyAdopterProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MyAdopterProfile) =>
      api<MyAdopterProfile>("/adopters/mine", { method: "PUT", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-adopter-profile"] });
      void qc.invalidateQueries({ queryKey: ["my-recommendations"] });
    },
  });
}

export function useMyRecommendations(enabled: boolean) {
  return useQuery({
    queryKey: ["my-recommendations"],
    queryFn: () => api<MyRecommendations>("/recommendations/mine"),
    enabled,
  });
}
