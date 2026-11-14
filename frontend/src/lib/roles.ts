import {
  BarChart3,
  Bell,
  ClipboardList,
  Heart,
  LayoutDashboard,
  Mail,
  PawPrint,
  ScrollText,
  ShieldAlert,
  SlidersHorizontal,
  Syringe,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  VETERINARIO: "Personal Veterinario",
  GESTION: "Gestión Animal y Adopciones",
  DIRECTIVO: "Personal Directivo",
  CLIENTE: "Cliente",
};

/** Roles del personal interno (el sistema de gestión). */
export const STAFF_ROLES: UserRole[] = ["ADMIN", "VETERINARIO", "GESTION", "DIRECTIVO"];
/** Roles que el ADMIN puede asignar (incluye CLIENTE para cuentas del portal). */
export const ALL_ROLES: UserRole[] = [...STAFF_ROLES, "CLIENTE"];

export const isStaff = (role: UserRole | undefined) => !!role && STAFF_ROLES.includes(role);

/** Ruta de inicio según el rol. */
export const homeForRole = (role: UserRole) => (role === "CLIENTE" ? "/portal" : "/dashboard");

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const A: UserRole = "ADMIN";
const V: UserRole = "VETERINARIO";
const G: UserRole = "GESTION";
const D: UserRole = "DIRECTIVO";

/** Ítems del sidebar por rol (sección 10.2). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard, roles: [A, V, G, D] },
  { label: "Animales", href: "/animales", icon: PawPrint, roles: [A, V, G, D] },
  { label: "Alertas", href: "/alertas", icon: Bell, roles: [A, V, G, D] },
  { label: "Cuarentena", href: "/cuarentena", icon: ShieldAlert, roles: [A, V, G] },
  { label: "Vacunas", href: "/vacunas", icon: Syringe, roles: [A, V] },
  { label: "Adoptables", href: "/adoptables", icon: Heart, roles: [A, V, G, D] },
  { label: "Adoptantes", href: "/adoptantes", icon: Users, roles: [G] },
  { label: "Solicitudes", href: "/solicitudes", icon: ClipboardList, roles: [A, G, D] },
  { label: "Reportes", href: "/reportes", icon: BarChart3, roles: [A, V, G, D] },
  { label: "Mensajes web", href: "/mensajes", icon: Mail, roles: [A, G] },
  { label: "Usuarios", href: "/admin/usuarios", icon: UserCog, roles: [A] },
  { label: "Catálogos y algoritmo", href: "/admin/catalogos", icon: SlidersHorizontal, roles: [A] },
  { label: "Auditoría", href: "/admin/auditoria", icon: ScrollText, roles: [A] },
];

/** Subrutas con permisos más restrictivos que su ítem del menú (sección 3). */
const ROUTE_RULES: { pattern: RegExp; roles: UserRole[]; title: string }[] = [
  { pattern: /^\/animales\/nuevo$/, roles: [G], title: "Registrar animal" },
  { pattern: /^\/animales\/[^/]+\/editar$/, roles: [G], title: "Editar animal" },
  { pattern: /^\/animales\/[^/]+\/consultas\/nueva$/, roles: [V], title: "Nueva consulta" },
  {
    pattern: /^\/animales\/[^/]+\/consultas\/[^/]+$/,
    roles: [A, V, G, D],
    title: "Consulta veterinaria",
  },
  { pattern: /^\/adoptantes\/nuevo$/, roles: [G], title: "Nuevo adoptante" },
  { pattern: /^\/adoptantes\/[^/]+\/editar$/, roles: [G], title: "Editar adoptante" },
  { pattern: /^\/solicitudes\/nueva$/, roles: [G], title: "Nueva solicitud" },
  { pattern: /^\/solicitudes\/[^/]+\/acta$/, roles: [G], title: "Acta de adopción" },
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
    "Zoonosis SCZ"
  );
}

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}
