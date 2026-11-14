"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const KEY = "zoonosis.cookieConsent";
export type CookieConsent = "all" | "necessary";

export function getCookieConsent(): CookieConsent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Banner de consentimiento de cookies. El sitio solo usa cookies necesarias
 * (sesión) y almacenamiento local de preferencias; no hay cookies de terceros.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  const choose = (v: CookieConsent) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* almacenamiento no disponible: se vuelve a mostrar la próxima vez */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl no-print sm:left-5 sm:right-auto sm:max-w-md"
    >
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Usamos cookies</p>
          <p className="mt-1">
            Utilizamos cookies necesarias para que el sitio funcione (por ejemplo, mantener tu
            sesión) y guardar tus preferencias. No usamos cookies publicitarias. Más información en
            nuestra{" "}
            <Link href="/privacidad#cookies" className="font-medium text-teal-700 underline">
              Política de Privacidad
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => choose("all")}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Aceptar
            </button>
            <button
              type="button"
              onClick={() => choose("necessary")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Solo necesarias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
