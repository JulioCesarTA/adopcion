"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Heart, LogOut, Menu, PawPrint, User, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "Adopta", icon: Heart },
  { href: "/portal/asistente", label: "Asistente", icon: Bot },
  { href: "/portal/perfil", label: "Mi perfil", icon: User },
];

/** Layout del portal de clientes (rol CLIENTE). El personal se redirige a su panel. */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (status === "authenticated" && user && user.role !== "CLIENTE") router.replace("/dashboard");
  }, [status, user, router, pathname]);

  useEffect(() => setOpen(false), [pathname]);

  if (status !== "authenticated" || !user || user.role !== "CLIENTE") {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/portal" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <PawPrint className="h-5 w-5" aria-hidden />
            </span>
            <span className="hidden sm:inline">Zoonosis SCZ</span>
          </Link>
          <nav aria-label="Portal" className="ml-4 hidden gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive(href) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              Hola, {user.fullName.split(" ")[0]}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" aria-hidden />{" "}
              <span className="hidden sm:inline">Salir</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="Portal" className="border-t border-slate-100 px-4 py-2 md:hidden">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="block rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <Link href="/terminos" className="hover:text-teal-700">
          Términos y Condiciones
        </Link>{" "}
        ·{" "}
        <Link href="/privacidad" className="hover:text-teal-700">
          Privacidad
        </Link>{" "}
        ·{" "}
        <Link href="/#contacto" className="hover:text-teal-700">
          Contacto
        </Link>
      </footer>
    </div>
  );
}
