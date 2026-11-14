"use client";

import { useState } from "react";
import { KeyRound, Pencil, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserMutations, useUsers } from "@/hooks/use-users";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/roles";
import type { User, UserRole } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ResetPasswordDialog, UserFormDialog } from "./user-dialogs";

/** CU02: gestionar usuarios y roles. */
export default function UsersPage() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q);

  const { data, isLoading, error } = useUsers({ q: debouncedQ, role, isActive, page });
  const { setActive } = useUserMutations();

  const [formUser, setFormUser] = useState<User | null | undefined>(undefined); // undefined = cerrado, null = nuevo
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [toggleUser, setToggleUser] = useState<User | null>(null);

  const onToggle = async () => {
    if (!toggleUser) return;
    try {
      await setActive.mutateAsync({ id: toggleUser.id, isActive: !toggleUser.isActive });
      toast.success(toggleUser.isActive ? "Usuario desactivado" : "Usuario activado");
      setToggleUser(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const resetFilters = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Nombre",
      sortValue: (u) => u.fullName,
      cell: (u) => (
        <div>
          <p className="font-medium text-slate-900">{u.fullName}</p>
          <p className="text-xs text-slate-500">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      sortValue: (u) => ROLE_LABELS[u.role],
      cell: (u) => ROLE_LABELS[u.role],
    },
    {
      key: "status",
      header: "Estado",
      sortValue: (u) => (u.isActive ? 0 : 1),
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={u.isActive ? "green" : "slate"}>{u.isActive ? "Activo" : "Inactivo"}</Badge>
          {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
            <Badge tone="amber">Bloqueado</Badge>
          )}
        </div>
      ),
    },
    {
      key: "created",
      header: "Creado",
      sortValue: (u) => u.createdAt,
      cell: (u) => <span className="text-slate-600">{formatDateTime(u.createdAt)}</span>,
      className: "hidden md:table-cell",
    },
    {
      key: "actions",
      header: "Acciones",
      className: "text-right",
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${u.fullName}`}
            onClick={() => setFormUser(u)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Restablecer contraseña de ${u.fullName}`}
            onClick={() => setResetUser(u)}
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={u.isActive ? `Desactivar ${u.fullName}` : `Activar ${u.fullName}`}
            disabled={u.id === me?.id}
            title={u.id === me?.id ? "No puedes desactivar tu propia cuenta" : undefined}
            onClick={() => setToggleUser(u)}
            className={
              u.isActive ? "text-red-600 hover:bg-red-50 hover:text-red-700" : "text-green-700"
            }
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Crea, edita y activa/desactiva las cuentas del personal."
        actions={
          <Button onClick={() => setFormUser(null)}>
            <Plus className="h-4 w-4" aria-hidden /> Nuevo usuario
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(u) => u.id}
        loading={isLoading}
        error={error ? errorMessage(error) : null}
        emptyTitle="No se encontraron usuarios"
        emptyDescription="Prueba con otros filtros de búsqueda."
        meta={data?.meta}
        onPageChange={setPage}
        toolbar={
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                aria-label="Buscar por nombre o email"
                placeholder="Buscar por nombre o email"
                className="pl-9"
                value={q}
                onChange={(e) => resetFilters(() => setQ(e.target.value))}
              />
            </div>
            <Select
              aria-label="Filtrar por rol"
              value={role}
              onChange={(e) => resetFilters(() => setRole(e.target.value as UserRole | ""))}
            >
              <option value="">Todos los roles</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por estado"
              value={isActive}
              onChange={(e) =>
                resetFilters(() => setIsActive(e.target.value as "true" | "false" | ""))
              }
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </Select>
          </div>
        }
      />

      {formUser !== undefined && (
        <UserFormDialog
          user={formUser}
          isSelf={formUser?.id === me?.id}
          onClose={() => setFormUser(undefined)}
        />
      )}
      {resetUser && <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />}
      <ConfirmDialog
        open={!!toggleUser}
        title={toggleUser?.isActive ? "Desactivar usuario" : "Activar usuario"}
        message={
          toggleUser?.isActive ? (
            <>
              <strong>{toggleUser.fullName}</strong> no podrá iniciar sesión y sus sesiones abiertas
              dejarán de funcionar.
            </>
          ) : (
            <>
              <strong>{toggleUser?.fullName}</strong> podrá volver a iniciar sesión.
            </>
          )
        }
        confirmLabel={toggleUser?.isActive ? "Desactivar" : "Activar"}
        tone={toggleUser?.isActive ? "danger" : "primary"}
        loading={setActive.isPending}
        onConfirm={() => void onToggle()}
        onCancel={() => setToggleUser(null)}
      />
    </>
  );
}
