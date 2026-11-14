"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { useUserMutations } from "@/hooks/use-users";
import { ApiError, errorMessage } from "@/lib/api";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/roles";
import type { User, UserRole } from "@/lib/types";
import { fullNameSchema, passwordSchema } from "@/lib/validation";

const roleSchema = z.enum(["ADMIN", "VETERINARIO", "GESTION", "DIRECTIVO", "CLIENTE"], {
  errorMap: () => ({ message: "Selecciona un rol" }),
});

const baseSchema = z.object({
  fullName: fullNameSchema,
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio").email("Email inválido"),
  role: roleSchema,
});
const createSchema = baseSchema.extend({ password: passwordSchema });
// Al editar no se cambia la contraseña aquí (hay un diálogo propio para restablecerla).
const editSchema = baseSchema.extend({ password: z.string() });

type FormValues = z.infer<typeof createSchema>;

export function UserFormDialog({
  user,
  isSelf,
  onClose,
}: {
  user: User | null;
  isSelf: boolean;
  onClose: () => void;
}) {
  const isNew = !user;
  const { create, update } = useUserMutations();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isNew ? createSchema : editSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      role: (user?.role ?? "") as UserRole,
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isNew) {
        await create.mutateAsync(values);
        toast.success("Usuario creado");
      } else {
        await update.mutateAsync({
          id: user.id,
          fullName: values.fullName,
          email: values.email,
          role: isSelf ? user.role : values.role,
        });
        toast.success("Usuario actualizado");
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("email", { message: err.message });
      } else {
        toast.error(errorMessage(err));
      }
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? "Nuevo usuario" : "Editar usuario"}
      description={
        isNew ? "La contraseña es temporal: el usuario puede cambiarla en “Mi perfil”." : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" loading={isSubmitting}>
            {isNew ? "Crear usuario" : "Guardar cambios"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Nombre completo" required error={errors.fullName?.message}>
          <Input {...register("fullName")} />
        </FormField>
        <FormField label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...register("email")} />
        </FormField>
        <FormField
          label="Rol"
          required
          error={errors.role?.message}
          hint={isSelf ? "No puedes cambiar tu propio rol." : undefined}
        >
          <Select disabled={isSelf} {...register("role")}>
            <option value="">Selecciona…</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </FormField>
        {isNew && (
          <FormField
            label="Contraseña temporal"
            required
            error={errors.password?.message}
            hint="Mínimo 8 caracteres, con al menos una letra y un número."
          >
            <Input type="password" autoComplete="new-password" {...register("password")} />
          </FormField>
        )}
      </form>
    </Dialog>
  );
}

const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });

/** CU25 v1: el ADMIN restablece una contraseña temporal. */
export function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { resetPassword } = useUserMutations();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await resetPassword.mutateAsync({ id: user.id, password });
      toast.success("Contraseña restablecida. Comunícala al usuario de forma segura.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Restablecer contraseña"
      description={`Se asignará una contraseña temporal a ${user.fullName} y se cerrarán sus sesiones.`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="reset-form" loading={isSubmitting}>
            Restablecer
          </Button>
        </>
      }
    >
      <form id="reset-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField label="Contraseña temporal" required error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </FormField>
        <FormField label="Confirmar contraseña" required error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
        </FormField>
      </form>
    </Dialog>
  );
}
