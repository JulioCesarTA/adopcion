"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homeForRole, isPortalRole } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

const schema = z.object({
  email: z.string().trim().min(1, "Ingresa tu email").email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
type FormValues = z.infer<typeof schema>;

/**
 * Destino tras el login: solo rutas internas y coherentes con el rol
 * (un cliente va al portal; el personal, al sistema de gestión).
 */
function destination(next: string | null, role: UserRole): string {
  const home = homeForRole(role);
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  const isPortal = next === "/portal" || next.startsWith("/portal/");
  return isPortalRole(role) === isPortal ? next : home;
}

function LoginForm() {
  const { login, status, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(destination(next, user.role));
  }, [status, user, router, next]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const u = await login(values.email, values.password);
      router.replace(destination(next, u.role));
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}
      <FormField label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="username" autoFocus {...register("email")} />
      </FormField>
      <FormField label="Contraseña" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register("password")} />
      </FormField>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Iniciar sesión
      </Button>
      <p className="text-center text-xs text-slate-500">
        ¿Olvidaste tu contraseña? Escríbenos por el formulario de contacto o pide al administrador
        que la restablezca.
      </p>
      <p className="border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
        ¿Quieres adoptar?{" "}
        <Link href="/registro" className="font-medium text-teal-700 hover:underline">
          Crea tu cuenta
        </Link>{" "}
        ·{" "}
        <Link href="/" className="font-medium text-teal-700 hover:underline">
          Volver al inicio
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
            <PawPrint className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Adopet</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión de adopciones y trazabilidad sanitaria animal
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
