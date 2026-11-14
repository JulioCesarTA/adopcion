"use client";

import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

/** Muestra sus hijos solo a los roles indicados (el backend valida igualmente). */
export function RoleGate({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasRole } = useAuth();
  return <>{hasRole(...roles) ? children : fallback}</>;
}
