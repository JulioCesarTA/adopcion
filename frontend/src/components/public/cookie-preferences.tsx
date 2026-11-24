"use client";

import { useEffect, useState } from "react";
import { getCookieConsent, resetCookieConsent, type CookieConsent } from "./cookie-banner";

/** Muestra la elección actual de cookies y permite cambiarla. */
export function CookiePreferences() {
  const [current, setCurrent] = useState<CookieConsent | null>(null);
  useEffect(() => setCurrent(getCookieConsent()), []);

  const label =
    current === "all" ? "Aceptaste todas" : current === "necessary" ? "Solo necesarias" : "Sin elegir";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <span>
        Tu elección actual: <strong>{label}</strong>
      </span>
      <button
        type="button"
        onClick={() => {
          resetCookieConsent();
          setCurrent(null);
        }}
        className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-white"
      >
        Cambiar mi elección
      </button>
    </div>
  );
}
