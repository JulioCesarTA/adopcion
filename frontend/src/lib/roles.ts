import {
  BarChart3,

  ClipboardList,
  Heart,
  LayoutDashboard,
  Mail,
  PawPrint,
  ShieldAlert,
  Stethoscope,
  Syringe,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  VETERINARIO: "Personal Veterinario",
  CLIENTE: "Cliente",
  ADOPTANTE: "Adoptante",
};

/** Los cuatro roles del sistema; el administrador puede asignar cualquiera. */
export const ALL_ROLES: UserRole[] = ["ADMIN", "VETERINARIO", "CLIENTE", "ADOPTANTE"];
export const ASSIGNABLE_ROLES = ALL_ROLES;

/** Roles que usan el portal (no el sistema de gestión). */
export const isPortalRole = (role: UserRole) => role === "CLIENTE" || role === "ADOPTANTE";
export const homeForRole = (role: UserRole) => (isPortalRole(role) ? "/portal" : "/dashboard");

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const A: UserRole = "ADMIN";
const V: UserRole = "VETERINARIO";

/** Ítems del sidebar por rol (sección 10.2). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard, roles: [A, V] },
  { label: "Animales", href: "/animales", icon: PawPrint, roles: [A, V] },
  { label: "Registrar consulta", href: "/consultas", icon: Stethoscope, roles: [A, V] },
  { label: "Cuarentena", href: "/cuarentena", icon: ShieldAlert, roles: [A, V] },
  { label: "Vacunas", href: "/vacunas", icon: Syringe, roles: [A, V] },
  { label: "Adoptables", href: "/adoptables", icon: Heart, roles: [A, V] },
  { label: "Adoptantes", href: "/adoptantes", icon: Users, roles: [A] },
  { label: "Solicitudes", href: "/solicitudes", icon: ClipboardList, roles: [A] },
  { label: "KPIs", href: "/kpis", icon: BarChart3, roles: [A, V] },
  { label: "Mensajes web", href: "/mensajes", icon: Mail, roles: [A] },
  { label: "Usuarios", href: "/admin/usuarios", icon: UserCog, roles: [A] },
];

/** Subrutas con permisos más restrictivos que su ítem del menú (sección 3). */
const ROUTE_RULES: { pattern: RegExp; roles: UserRole[]; title: string }[] = [
  { pattern: /^\/animales\/nuevo$/, roles: [A], title: "Registrar animal" },
  { pattern: /^\/animales\/[^/]+\/editar$/, roles: [A], title: "Editar animal" },
  { pattern: /^\/animales\/[^/]+\/consultas\/nueva$/, roles: [A, V], title: "Nueva consulta" },
  {
    pattern: /^\/animales\/[^/]+\/consultas\/[^/]+$/,
    roles: [A, V],
    title: "Consulta veterinaria",
  },
  { pattern: /^\/solicitudes\/[^/]+\/acta$/, roles: [A], title: "Acta de adopción" },
];

const EXTRA_TITLES: Record<string, string> = { "/perfil": "Mi perfil" };

function matchItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

/** ¿Puede el rol entrar a esta ruta? Rutas fuera del menú (p. ej. /perfil) son para todos. */
export function canAccessPath(pathname: string, role: UserRole): boolean {
  const rule = ROUTE_RULES.find((r) => r.pattern.test(pathname));
  if (rule) return rule.roles.includes(role);
  const item = matchItem(pathname);
  return item ? item.roles.includes(role) : true;
}

export function titleForPath(pathname: string): string {
  return (
    EXTRA_TITLES[pathname] ??
    ROUTE_RULES.find((r) => r.pattern.test(pathname))?.title ??
    matchItem(pathname)?.label ??
    "Adopet"
  );
}

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}
