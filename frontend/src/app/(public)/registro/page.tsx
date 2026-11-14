"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/hooks/use-public";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homeForRole } from "@/lib/roles";
import { fullNameSchema, passwordSchema } from "@/lib/validation";

const schema = z
  .object({
    fullName: fullNameSchema,
    email: z.string().trim().min(1, "Escribe tu correo").email("Correo inválido"),
    phone: z
      .string()
      .trim()
      .regex(/^([0-9+()\- ]{6,30})?$/, "Teléfono inválido")
      .optional(),
    password: passwordSchema,
    confirm: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "Debes aceptar los Términos y Condiciones y la Política de Privacidad",
      }),
    }),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
type FormValues = z.infer<typeof schema>;

/** Registro de clientes con aceptación obligatoria de términos. */
export default function RegisterPage() {
  const router = useRouter();
  const { login, status, user } = useAuth();
  const register_ = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirm: "" },
  });

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(homeForRole(user.role));
  }, [status, user, router]);

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await register_.mutateAsync({
        fullName: v.fullName,
        email: v.email,
        phone: v.phone || undefined,
        password: v.password,
        acceptTerms: v.acceptTerms,
      });
      await login(v.email, v.password);
      toast.success("¡Bienvenido! Tu cuenta fue creada.");
      router.replace("/portal");
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.status === 429
          ? "Demasiados intentos. Espera un minuto."
          : errorMessage(err),
      );
    }
  });

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6 text-center">
        <span className="inline-flex rounded-2xl bg-teal-600 p-3 text-white">
          <UserPlus className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Para ver los animales en adopción y consultar con el asistente.
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {serverError}{" "}
              {serverError.includes("Inicia sesión") && (
                <Link href="/login" className="font-medium underline">
                  Ir a iniciar sesión
                </Link>
              )}
            </span>
          </div>
        )}
        <FormField label="Nombre completo" required error={errors.fullName?.message}>
          <Input autoComplete="name" {...register("fullName")} />
        </FormField>
        <FormField label="Correo electrónico" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField label="Teléfono" error={errors.phone?.message} hint="Opcional">
          <Input type="tel" autoComplete="tel" {...register("phone")} />
        </FormField>
        <FormField
          label="Contraseña"
          required
          error={errors.password?.message}
          hint="Mínimo 8 caracteres con al menos una letra y un número."
        >
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </FormField>
        <FormField label="Confirmar contraseña" required error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
        </FormField>
        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-teal-600"
              aria-invalid={!!errors.acceptTerms}
              {...register("acceptTerms")}
            />
            <span>
              He leído y acepto los{" "}
              <Link
                href="/terminos"
                target="_blank"
                className="font-medium text-teal-700 underline"
              >
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacidad"
                target="_blank"
                className="font-medium text-teal-700 underline"
              >
                Política de Privacidad
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="mt-1 text-xs text-red-600">{errors.acceptTerms.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Crear cuenta
        </Button>
        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
