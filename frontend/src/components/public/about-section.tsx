"use client";

import {
  BadgeCheck,
  Building2,
  Compass,
  Eye,
  HeartHandshake,
  Lightbulb,
  Lock,
  PawPrint,
  Scale,
  Target,
  Users,
} from "lucide-react";
import { usePublicInfo } from "@/hooks/use-public";

const TAGLINE = "Adopet";

const MISSION =
  "Centralizar y optimizar la atención sanitaria y la adopción de perros y gatos rescatados, " +
  "combinando el trabajo de veterinarios y personal con tecnología, para que cada animal reciba " +
  "atención a tiempo y encuentre una familia que se comprometa con su cuidado.";

const VISION =
  "Ser en Bolivia la plataforma de referencia en salud animal y adopción responsable: un lugar " +
  "donde instituciones, veterinarios y familias trabajen con información clara y confiable, y donde " +
  "ningún animal rescatado quede sin atención ni sin seguimiento.";

const VALUES = [
  {
    icon: HeartHandshake,
    title: "Bienestar animal",
    text: "Cada decisión parte del cuidado y el buen trato de los animales.",
  },
  {
    icon: Scale,
    title: "Responsabilidad",
    text: "Adopción con evaluación, acta y seguimiento. Nadie adopta a la ligera.",
  },
  {
    icon: BadgeCheck,
    title: "Transparencia",
    text: "Historial clínico y proceso de adopción claros para todas las partes.",
  },
  {
    icon: Lock,
    title: "Respeto por tus datos",
    text: "Pedimos solo lo necesario, con tu consentimiento y bajo control de acceso por rol.",
  },
  {
    icon: Lightbulb,
    title: "Innovación útil",
    text: "Usamos tecnología, como la recomendación de compatibilidad, para apoyar a las personas, no para reemplazarlas.",
  },
  {
    icon: Users,
    title: "Salud pública",
    text: "Prevenir zoonosis y vacunar protege a los animales y a toda la comunidad.",
  },
];

const TEAM = [
  { name: "Claudia Liseth Cortez Siles", role: "Equipo de desarrollo" },
  { name: "Julio Cesar Torrico Avila", role: "Equipo de desarrollo" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .filter((_, i, a) => i === 0 || i === a.length - 2)
    .map((w) => w[0])
    .join("");

/** Sección corporativa: quiénes somos, misión, visión, valores, equipo y datos de la empresa. */
export function AboutSection() {
  const { data: info } = usePublicInfo();

  // Datos estructurados para que los buscadores identifiquen a la organización.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Adopet",
    slogan: TAGLINE,
    description: MISSION,
    address: { "@type": "PostalAddress", addressLocality: "Santa Cruz de la Sierra", addressCountry: "BO" },
    ...(info?.email ? { email: info.email } : {}),
    ...(info?.phone ? { telephone: info.phone } : {}),
    sameAs: Object.values(info?.social ?? {}).filter((u): u is string => !!u && !u.includes("wa.me")),
  };

  return (
    <section id="quienes-somos" className="scroll-mt-20 bg-teal-50/60 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Quiénes somos */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Quiénes somos
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{TAGLINE}</h2>
          <p className="mt-4 text-slate-600">
            <strong>Adopet</strong> es una plataforma web de Santa Cruz de la Sierra que reúne en una sola
            plataforma el registro de los animales, su historia clínica digital, el control de
            vacunas y cuarentenas y el proceso completo de adopción, desde la solicitud hasta el
            seguimiento posterior. Además, los dueños de mascotas reservan citas clínicas y
            consultan el historial de sus animales desde su propio portal.
          </p>
        </div>

        {/* Misión y visión */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl bg-teal-700 p-7 text-white">
            <span className="inline-flex rounded-xl bg-white/15 p-3">
              <Target className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-4 text-xl font-semibold">Nuestra misión</h3>
            <p className="mt-2 leading-relaxed text-teal-50">{MISSION}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-7">
            <span className="inline-flex rounded-xl bg-teal-50 p-3 text-teal-700">
              <Eye className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Nuestra visión</h3>
            <p className="mt-2 leading-relaxed text-slate-600">{VISION}</p>
          </article>
        </div>

        {/* Valores */}
        <h3 className="mt-14 text-center text-2xl font-bold tracking-tight text-slate-900">
          Nuestros valores
        </h3>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <Icon className="h-6 w-6 text-teal-600" aria-hidden />
              <h4 className="mt-3 font-semibold text-slate-900">{title}</h4>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ul>

        {/* Equipo y datos corporativos */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Users className="h-5 w-5 text-teal-600" aria-hidden /> Equipo
            </h3>
            <ul className="mt-5 space-y-4">
              {TEAM.map((m) => (
                <li key={m.name} className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 font-semibold text-white"
                  >
                    {initials(m.name)}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{m.name}</p>
                    <p className="text-sm text-slate-500">{m.role}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-slate-600">
              Un equipo de ingeniería que une tecnología y cuidado animal para que el proceso de
              adopción sea ordenado, seguro y con seguimiento.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Building2 className="h-5 w-5 text-teal-600" aria-hidden /> Datos de Adopet
            </h3>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
              <dt className="font-medium text-slate-500">Nombre</dt>
              <dd className="text-slate-900">Adopet</dd>
              <dt className="font-medium text-slate-500">Qué es</dt>
              <dd className="text-slate-900">
                Plataforma web para la gestión sanitaria y la adopción responsable de perros y gatos
              </dd>
              {info && (
                <>
                  <dt className="font-medium text-slate-500">Ubicación</dt>
                  <dd className="text-slate-900">{info.address}</dd>
                </>
              )}
              {info && (
                <>
                  <dt className="font-medium text-slate-500">Horario</dt>
                  <dd className="text-slate-900">{info.hours}</dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Cierre */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <p className="flex items-center gap-3 text-slate-700">
            <PawPrint className="h-6 w-6 text-teal-600" aria-hidden />
            ¿Quieres conocernos mejor o trabajar con nosotros?
          </p>
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Compass className="h-4 w-4" aria-hidden /> Escríbenos
          </a>
        </div>
      </div>
    </section>
  );
}
