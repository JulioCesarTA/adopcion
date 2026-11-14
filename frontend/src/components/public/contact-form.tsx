"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { useContact } from "@/hooks/use-public";
import { ApiError, errorMessage } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre").max(150),
  email: z.string().trim().min(1, "Escribe tu correo").email("Correo inválido"),
  phone: z
    .string()
    .trim()
    .regex(/^([0-9+()\- ]{6,30})?$/, "Teléfono inválido")
    .optional(),
  subject: z.string().trim().min(1, "Escribe el asunto").max(150),
  message: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)").max(5000),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el tratamiento de tus datos personales" }),
  }),
  website: z.string().optional(), // campo trampa anti-spam
});
type FormValues = z.infer<typeof schema>;

/** Formulario «Contáctame» con casilla obligatoria de tratamiento de datos. */
export function ContactForm({
  initial,
}: {
  /** Valores iniciales (p. ej. datos del cliente y asunto «Interés en adoptar a…»). */
  initial?: Partial<Pick<FormValues, "name" | "email" | "phone" | "subject" | "message">>;
}) {
  const contact = useContact();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const defaults = {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "",
    ...initial,
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await contact.mutateAsync({ ...v, phone: v.phone || undefined });
      setSent(true);
      reset({ ...defaults, subject: "", message: "" });
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.status === 429
          ? "Enviaste varios mensajes seguidos. Espera un minuto."
          : errorMessage(err),
      );
    }
  });

  if (sent) {
    return (
      <div
        className="flex flex-col items-center rounded-2xl border border-green-200 bg-green-50 p-8 text-center"
        role="status"
      >
        <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden />
        <p className="mt-3 text-lg font-semibold text-slate-900">¡Gracias! Recibimos tu mensaje.</p>
        <p className="mt-1 text-sm text-slate-600">
          Te responderemos al correo que indicaste lo antes posible.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm font-medium text-teal-700 hover:underline"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    >
      <FormField label="Nombre completo" required error={errors.name?.message}>
        <Input autoComplete="name" {...register("name")} />
      </FormField>
      <FormField label="Correo electrónico" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </FormField>
      <FormField label="Teléfono" error={errors.phone?.message} hint="Opcional">
        <Input type="tel" autoComplete="tel" {...register("phone")} />
      </FormField>
      <FormField label="Asunto" required error={errors.subject?.message}>
        <Input {...register("subject")} />
      </FormField>
      <FormField label="Mensaje" required error={errors.message?.message} className="sm:col-span-2">
        <Textarea rows={5} {...register("message")} />
      </FormField>
      {/* Campo trampa: oculto para personas, los bots lo completan */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No completar
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-teal-600"
            aria-invalid={!!errors.acceptPrivacy}
            {...register("acceptPrivacy")}
          />
          <span>
            Acepto el tratamiento de mis datos personales para responder a mi consulta, según la{" "}
            <Link
              href="/privacidad"
              className="font-medium text-teal-700 underline"
              target="_blank"
            >
              Política de Privacidad
            </Link>
            .
          </span>
        </label>
        {errors.acceptPrivacy && (
          <p className="mt-1 text-xs text-red-600">{errors.acceptPrivacy.message}</p>
        )}
      </div>
      {serverError && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"
          role="alert"
        >
          {serverError}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          <Send className="h-4 w-4" aria-hidden /> Enviar mensaje
        </Button>
      </div>
    </form>
  );
}
