"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, PawPrint, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { homeForRole } from "@/lib/roles";

const LINKS = [
  { href: "/#nosotros", label: "Nosotros" },
  { href: "/#adopta", label: "Adopta" },
  { href: "/#como-adoptar", label: "Cómo adoptar" },
  { href: "/#preguntas", label: "Preguntas" },
  { href: "/#contacto", label: "Contáctame" },
];

export function SiteHeader() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const loggedIn = status === "authenticated" && user;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
            <PawPrint className="h-5 w-5" aria-hidden />
          </span>
          Zoonosis SCZ
        </Link>
        <nav
          aria-label="Secciones"
          className="ml-auto hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex"
        >
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-teal-700">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {loggedIn ? (
            <Link
              href={homeForRole(user.role)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Ir a mi cuenta
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:block"
              >
                Ingresar
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
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
        <nav
          aria-label="Secciones"
          className="border-t border-slate-100 bg-white px-4 py-2 md:hidden"
        >
          {[...LINKS, ...(loggedIn ? [] : [{ href: "/login", label: "Ingresar" }])].map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
