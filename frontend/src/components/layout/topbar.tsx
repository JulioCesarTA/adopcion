"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { useAlerts } from "@/hooks/use-admin";
import { titleForPath } from "@/lib/roles";

/** Topbar: título, buscador global de animales y campana de alertas (sección 10.1). */
export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const total = useAlerts().data?.total ?? 0;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/animales?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur no-print sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate text-lg font-semibold text-slate-900">{titleForPath(pathname)}</h1>

      <form onSubmit={onSearch} role="search" className="ml-auto hidden w-full max-w-xs md:block">
        <label htmlFor="global-search" className="sr-only">
          Buscar animal por código o nombre
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            id="global-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar animal (código o nombre)"
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
      </form>

      <Link
        href="/alertas"
        className="relative ml-auto rounded-md p-2 text-slate-600 hover:bg-slate-100 md:ml-0"
        aria-label={total ? `Alertas: ${total} pendientes` : "Alertas"}
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </Link>
    </header>
  );
}
