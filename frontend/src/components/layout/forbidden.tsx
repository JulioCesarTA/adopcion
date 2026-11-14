import Link from "next/link";
import { ShieldX } from "lucide-react";

/** Página “403 – No tienes acceso” (sección 10.2). */
export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-red-50 p-4">
        <ShieldX className="h-8 w-8 text-red-600" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-red-600">Error 403</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-900">No tienes acceso</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Tu rol no tiene permiso para ver esta sección. Si crees que es un error, contacta al
        administrador.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Volver al panel
      </Link>
    </div>
  );
}
