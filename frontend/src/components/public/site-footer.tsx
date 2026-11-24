"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, PawPrint, Phone } from "lucide-react";
import { usePublicInfo } from "@/hooks/use-public";
import { SocialLinks } from "./social-links";

export function SiteFooter() {
  const { data: info } = usePublicInfo();
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-white">
            <PawPrint className="h-5 w-5 text-teal-400" aria-hidden /> {info?.shortName ?? "Adopet"}
          </p>
          <p className="mt-3 text-sm">
            {info?.name ?? "Adopet"}. Prevención de zoonosis, atención sanitaria y adopción
            responsable.
          </p>
          <div className="mt-4">
            <SocialLinks social={info?.social} />
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm">
            {info && (
              <>
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />{" "}
                  {info.address}
                </li>
                <li className="flex gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />{" "}
                  {info.phone}
                </li>
                <li className="flex gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />{" "}
                  {info.email}
                </li>
                <li className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden />{" "}
                  {info.hours}
                </li>
              </>
            )}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Enlaces</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/#quienes-somos" className="hover:text-white">
                Quiénes somos
              </Link>
            </li>
            <li>
              <Link href="/#como-nos-sostenemos" className="hover:text-white">
                Cómo nos sostenemos
              </Link>
            </li>
            <li>
              <Link href="/#adopta" className="hover:text-white">
                Animales en adopción
              </Link>
            </li>
            <li>
              <Link href="/#contacto" className="hover:text-white">
                Contáctame
              </Link>
            </li>
            <li>
              <Link href="/terminos" className="hover:text-white">
                Términos y Condiciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-white">
                Política de Privacidad y Cookies
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Acceso del personal
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {info?.name ?? "Adopet"}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
