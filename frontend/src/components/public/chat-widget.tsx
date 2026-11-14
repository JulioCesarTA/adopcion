"use client";

import { useEffect, useState } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import { ChatPanel } from "./chat-panel";

/** Burbuja flotante del asistente virtual en el sitio público. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="no-print">
      {open && (
        <section
          role="dialog"
          aria-label="Asistente virtual"
          className="fixed inset-x-3 bottom-20 z-50 flex h-[min(560px,75vh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-96"
        >
          <header className="flex items-center gap-3 bg-teal-600 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Bot className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Asistente virtual</p>
              <p className="text-xs text-teal-100">Respuestas al instante</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="rounded-md p-1 hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <ChatPanel className="flex-1" compact />
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Cerrar asistente virtual" : "Abrir asistente virtual"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-teal-700"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
