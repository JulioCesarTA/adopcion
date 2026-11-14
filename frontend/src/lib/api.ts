import type { FieldError, User } from "./types";

/**
 * Cliente API central (sección 10.5).
 * - El access token vive solo en memoria.
 * - El refresh token es una cookie httpOnly que setea el backend.
 * - Ante un 401 intenta refrescar una vez y reintenta la petición.
 */

const BASE = "/api/v1";

let accessToken: string | null = null;
let refreshing: Promise<SessionResponse | null> | null = null;
let onAuthFailure: (() => void) | null = null;

export interface SessionResponse {
  accessToken: string;
  user: User;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: FieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setAuthFailureHandler(fn: (() => void) | null) {
  onAuthFailure = fn;
}

export type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** No intentar refrescar ante 401 (login/refresh/logout). */
  skipRefresh?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { message?: string; errors?: FieldError[] };
    return new ApiError(res.status, body.message ?? res.statusText, body.errors);
  } catch {
    return new ApiError(res.status, res.statusText || "Error de red");
  }
}

async function rawRequest(path: string, opts: RequestOptions): Promise<Response> {
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      credentials: "include",
      body:
        opts.body === undefined
          ? undefined
          : isForm
            ? (opts.body as FormData)
            : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión.");
  }
}

/** Refresca la sesión (deduplicado: varias peticiones comparten el mismo refresh). */
export function refreshSession(): Promise<SessionResponse | null> {
  refreshing ??= (async () => {
    try {
      const res = await rawRequest("/auth/refresh", { method: "POST", skipRefresh: true });
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const session = (await res.json()) as SessionResponse;
      setAccessToken(session.accessToken);
      return session;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, opts);

  if (res.status === 401 && !opts.skipRefresh) {
    const session = await refreshSession();
    if (!session) {
      onAuthFailure?.();
      throw await parseError(res);
    }
    res = await rawRequest(path, opts);
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<SessionResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipRefresh: true,
    }),
  logout: () => api<void>("/auth/logout", { method: "POST", skipRefresh: true }),
  me: () => api<User>("/auth/me"),
  updateMe: (fullName: string) => api<User>("/auth/me", { method: "PATCH", body: { fullName } }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<void>("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
};

/** Descarga un archivo autenticado (p. ej. CSV) y lo guarda con su nombre. */
export async function downloadFile(path: string, query?: Query, fallbackName = "archivo") {
  let res = await rawRequest(path, { query });
  if (res.status === 401 && (await refreshSession())) res = await rawRequest(path, { query });
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Mensaje legible para toasts. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado";
}
