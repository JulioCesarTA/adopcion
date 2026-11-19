import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, type Query } from "@/lib/api";
import type { AnimalListItem, Paginated, User } from "@/lib/types";

export interface InstitutionInfo {
  name: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  social: Partial<Record<"facebook" | "instagram" | "tiktok" | "youtube" | "whatsapp", string>>;
  chatEnabled: boolean;
}

export type PublicAnimal = Omit<AnimalListItem, "status"> & { status?: AnimalListItem["status"] };

/** Datos públicos de la institución (redes, contacto, horario). */
export function usePublicInfo() {
  return useQuery({
    queryKey: ["public-info"],
    queryFn: () => api<InstitutionInfo>("/public/info", { skipRefresh: true }),
    staleTime: 10 * 60_000,
  });
}

/** Animales disponibles para adopción (campos públicos). */
export function usePublicAnimals(filters: Query) {
  return useQuery({
    queryKey: ["public-animals", filters],
    queryFn: () =>
      api<Paginated<PublicAnimal>>("/public/animals", { query: filters, skipRefresh: true }),
    placeholderData: keepPreviousData,
  });
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  acceptPrivacy: boolean;
  website?: string;
}

export function useContact() {
  return useMutation({
    mutationFn: (input: ContactInput) =>
      api<{ ok: boolean; emailSent: boolean }>("/public/contact", {
        method: "POST",
        body: input,
        skipRefresh: true,
      }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: {
      fullName: string;
      email: string;
      phone?: string;
      password: string;
      acceptTerms: boolean;
      accountType?: "CLIENTE" | "ADOPTANTE";
    }) => api<User>("/public/register", { method: "POST", body: input, skipRefresh: true }),
  });
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  return useMutation({
    mutationFn: (messages: ChatTurn[]) =>
      api<{ reply: string }>("/chat", { method: "POST", body: { messages }, skipRefresh: true }),
  });
}
