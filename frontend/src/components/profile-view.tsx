"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { authApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";
import { fullNameSchema, passwordSchema } from "@/lib/validation";

const profileSchema = z.object({ fullName: fullNameSchema });

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "La nueva contraseña debe ser distinta de la actual",
  });

/** CU25: editar nombre y cambiar contraseña. */
export function ProfileView() {
  const { user, setUser } = useAuth();

  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { fullName: user?.fullName ?? "" },
  });

  const pwd = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  if (!user) return null;

  const saveProfile = profile.handleSubmit(async ({ fullName }) => {
    try {
      setUser(await authApi.updateMe(fullName));
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const savePassword = pwd.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await authApi.changePassword(currentPassword, newPassword);
      pwd.reset();
      toast.success("Contraseña actualizada");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <>
      <PageHeader title="Mi perfil" description="Actualiza tus datos y tu contraseña." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Datos personales" />
          <CardBody>
            <form onSubmit={saveProfile} noValidate className="space-y-4">
              <FormField
                label="Nombre completo"
                required
                error={profile.formState.errors.fullName?.message}
              >
                <Input {...profile.register("fullName")} />
              </FormField>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-800">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Rol</dt>
                  <dd className="font-medium text-slate-800">{ROLE_LABELS[user.role]}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cuenta creada</dt>
                  <dd className="font-medium text-slate-800">{formatDateTime(user.createdAt)}</dd>
                </div>
              </dl>
              <div className="flex justify-end">
                <Button type="submit" loading={profile.formState.isSubmitting}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Cambiar contraseña"
            description="Mínimo 8 caracteres, con al menos una letra y un número."
          />
          <CardBody>
            <form onSubmit={savePassword} noValidate className="space-y-4">
              <FormField
                label="Contraseña actual"
                required
                error={pwd.formState.errors.currentPassword?.message}
              >
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...pwd.register("currentPassword")}
                />
              </FormField>
              <FormField
                label="Nueva contraseña"
                required
                error={pwd.formState.errors.newPassword?.message}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...pwd.register("newPassword")}
                />
              </FormField>
              <FormField
                label="Confirmar nueva contraseña"
                required
                error={pwd.formState.errors.confirmPassword?.message}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...pwd.register("confirmPassword")}
                />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" loading={pwd.formState.isSubmitting}>
                  Cambiar contraseña
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
