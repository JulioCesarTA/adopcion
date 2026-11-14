"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { canAccessPath } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { Forbidden } from "./forbidden";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const COLLAPSE_KEY = "zoonosis.sidebarCollapsed";

/** Layout autenticado: sidebar + topbar + contenido, con control de acceso por rol. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* localStorage no disponible */
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
    // El sistema de gestión es solo para el personal: un cliente va a su portal
    if (status === "authenticated" && user?.role === "CLIENTE") router.replace("/portal");
  }, [status, user, router, pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignorar */
      }
      return !c;
    });
  }, []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (status !== "authenticated" || !user || user.role === "CLIENTE") {
    return (
      <div className="flex min-h-screen" aria-busy="true" aria-label="Cargando">
        <div className="hidden w-[260px] border-r border-slate-200 bg-white p-4 lg:block">
          <Skeleton className="mb-6 h-9 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-6 h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />
      <div
        className={cn(
          "app-content transition-all duration-200",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]",
        )}
      >
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {canAccessPath(pathname, user.role) ? children : <Forbidden />}
        </main>
      </div>
    </div>
  );
}
