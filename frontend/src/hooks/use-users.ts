import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, User, UserRole } from "@/lib/types";

export interface UsersFilters {
  q?: string;
  role?: UserRole | "";
  isActive?: "true" | "false" | "";
  page: number;
  pageSize?: number;
}

export interface UserInput {
  fullName: string;
  email: string;
  role: UserRole;
  password?: string;
}

const KEY = ["users"] as const;

export function useUsers(filters: UsersFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () =>
      api<Paginated<User>>("/users", {
        query: { ...filters, pageSize: filters.pageSize ?? 10 },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    create: useMutation({
      mutationFn: (input: UserInput) => api<User>("/users", { method: "POST", body: input }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: Omit<UserInput, "password"> & { id: string }) =>
        api<User>(`/users/${id}`, { method: "PATCH", body: input }),
      onSuccess: invalidate,
    }),
    setActive: useMutation({
      mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
        api<User>(`/users/${id}/active`, { method: "PATCH", body: { isActive } }),
      onSuccess: invalidate,
    }),
    resetPassword: useMutation({
      mutationFn: ({ id, password }: { id: string; password: string }) =>
        api<User>(`/users/${id}/reset-password`, { method: "POST", body: { password } }),
      onSuccess: invalidate,
    }),
  };
}
