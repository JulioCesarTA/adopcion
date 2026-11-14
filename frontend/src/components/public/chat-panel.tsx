"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, User } from "lucide-react";
import { useChat, type ChatTurn } from "@/hooks/use-public";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_TURNS = 20;
const MAX_CHARS = 2000;
const GREETING =
  "¡Hola! Soy el asistente virtual de Zoonosis SCZ. Puedo ayudarte con preguntas sobre adopción, vacunas, horarios y tenencia responsable. ¿En qué te ayudo?";
const SUGGESTIONS = [
  "¿Cómo puedo adoptar?",
  "¿Cuál es el horario de atención?",
  "¿Qué animales hay disponibles?",
  "Me mordió un perro, ¿qué hago?",
];

/** Recorta el historial a los últimos turnos, empezando siempre por un mensaje del usuario. */
function trimHistory(turns: ChatTurn[]): ChatTurn[] {
  let out = turns.slice(-MAX_TURNS);
  while (out.length && out[0].role !== "user") out = out.slice(1);
  return out;
}

/** Conversación con el asistente virtual (Claude) vía POST /api/v1/chat. */
export function ChatPanel({ className, compact }: { className?: string; compact?: boolean }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chat = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, chat.isPending]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || chat.isPending) return;
    setError(null);
    const next: ChatTurn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setInput("");
    try {
      const { reply } = await chat.mutateAsync(trimHistory(next));
      setTurns((t) => [...t, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(errorMessage(err));
      // Quita el mensaje sin respuesta para que el historial siga alternando
      setTurns((t) => t.slice(0, -1));
      setInput(content);
    } finally {
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-label="Conversación"
      >
        <Bubble role="assistant">{GREETING}</Bubble>
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <Bubble key={i} role={t.role}>
            {t.content}
          </Bubble>
        ))}
        {chat.isPending && (
          <div className="flex items-center gap-2 pl-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Escribiendo…
          </div>
        )}
        {error && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-slate-200 p-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Escribe tu pregunta
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={compact ? 1 : 2}
            maxLength={MAX_CHARS}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe tu pregunta…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || chat.isPending}
            aria-label="Enviar"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>Asistente con IA: puede equivocarse. Para trámites, contáctanos.</span>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTurns([]);
                setError(null);
              }}
              className="inline-flex items-center gap-1 hover:text-slate-600"
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> Nueva conversación
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-slate-200 text-slate-600" : "bg-teal-600 text-white",
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <p
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "rounded-tr-sm bg-teal-600 text-white"
            : "rounded-tl-sm bg-slate-100 text-slate-800",
        )}
      >
        <span className="sr-only">{isUser ? "Tú: " : "Asistente: "}</span>
        {children}
      </p>
    </div>
  );
}
