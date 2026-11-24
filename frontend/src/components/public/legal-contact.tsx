"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { usePublicInfo } from "@/hooks/use-public";
import { SocialLinks } from "./social-links";

/**
 * Bloque de contacto y redes oficiales para las páginas legales. Lee los datos
 * de la institución del backend, así que los enlaces a Facebook, Instagram,
 * TikTok, YouTube y WhatsApp son siempre los configurados (vacío = no se muestra).
 */
export function LegalContact({ intro }: { intro: string }) {
  const { data: info } = usePublicInfo();
  if (!info) return null;
  return (
    <div className="not-prose rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm text-slate-600">{intro}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        <li className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {info.address}
        </li>
        <li className="flex gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {info.phone}
        </li>
        <li className="flex gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
          <a href={`mailto:${info.email}`} className="font-medium text-teal-700 underline">
            {info.email}
          </a>
        </li>
        <li className="flex gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {info.hours}
        </li>
      </ul>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nuestras redes oficiales
        </p>
        <SocialLinks social={info.social} variant="light" showLabels />
      </div>
    </div>
  );
}
