"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Clock,
  HeartHandshake,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserPlus,
} from "lucide-react";
import { AnimalCard } from "@/components/animals/animal-card";
import { EmptyState } from "@/components/empty-state";
import { AboutSection } from "@/components/public/about-section";
import { BusinessModelSection } from "@/components/public/business-model-section";
import { ContactForm } from "@/components/public/contact-form";
import { SocialLinks } from "@/components/public/social-links";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAnimals, usePublicInfo } from "@/hooks/use-public";
import { useAuth } from "@/lib/auth";

const SERVICES = [
  {
    icon: Syringe,
    title: "Vacunación antirrábica",
    text: "Campañas y control de vacunación para prevenir la rabia y otras zoonosis en la ciudad.",
  },
  {
    icon: Stethoscope,
    title: "Atención sanitaria",
    text: "Evaluación veterinaria, tratamientos y periodos de observación y cuarentena con historial clínico digital.",
  },
  {
    icon: HeartHandshake,
    title: "Adopción responsable",
    text: "Unimos a cada animal con la familia adecuada, con evaluación de compatibilidad y seguimiento posterior.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta",
    text: "Regístrate en el sitio aceptando los términos y condiciones.",
  },
  {
    icon: Home,
    title: "Cuéntanos de tu hogar",
    text: "Vivienda, patio, niños, otros animales y tiempo disponible.",
  },
  {
    icon: ClipboardCheck,
    title: "Evaluación",
    text: "El personal evalúa la compatibilidad y te contacta para una entrevista.",
  },
  {
    icon: ShieldCheck,
    title: "Acta y entrega",
    text: "Firmas el acta de adopción responsable y recibes a tu nuevo compañero.",
  },
];

const FAQ = [
  {
    q: "¿Cuánto cuesta adoptar?",
    a: "La adopción no tiene fines de lucro. Consulta con la institución por cualquier costo asociado a vacunas o esterilización.",
  },
  {
    q: "¿Qué necesito para adoptar?",
    a: "Ser mayor de edad, presentar tu cédula de identidad, contar con un espacio adecuado y comprometerte con la tenencia responsable.",
  },
  {
    q: "¿Los animales se entregan vacunados?",
    a: "Todos los animales tienen evaluación veterinaria antes de ser habilitados para adopción y su historial de vacunas se registra en el sistema.",
  },
  {
    q: "Me mordió un perro, ¿qué hago?",
    a: "Lava la herida con abundante agua y jabón durante varios minutos y acude de inmediato a un centro de salud. El animal debe quedar en observación.",
  },
  {
    q: "¿Puedo devolver al animal si no puedo cuidarlo?",
    a: "Sí. Nunca lo abandones: comunícate con la institución para coordinar su reingreso.",
  },
];

export default function LandingPage() {
  const { data: info } = usePublicInfo();
  const { data: animals, isLoading } = usePublicAnimals({ pageSize: 6 });
  const { status, user } = useAuth();
  const adoptHref =
    status === "authenticated" && (user?.role === "CLIENTE" || user?.role === "ADOPTANTE")
      ? "/portal"
      : "/registro";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              {info?.name ?? "Adopet"}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Cuidamos la salud de los animales y de nuestra ciudad
            </h1>
            <p className="mt-4 max-w-lg text-lg text-teal-50">
              Prevención de zoonosis, atención veterinaria y adopción responsable. Dale un hogar a
              quien te está esperando.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#adopta"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-teal-700 shadow hover:bg-teal-50"
              >
                Ver animales en adopción <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10"
              >
                Contáctanos
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { n: animals?.meta.total ?? "—", l: "animales esperando un hogar" },
              { n: "24/7", l: "asistente virtual para tus dudas" },
              { n: "100 %", l: "evaluados por veterinarios" },
              { n: "1", l: "compromiso: tenencia responsable" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <p className="text-3xl font-bold">{s.n}</p>
                <p className="mt-1 text-sm text-teal-50">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros */}
      <section id="servicios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          ¿Qué hacemos?
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">
          Trabajamos por la salud pública previniendo enfermedades que se transmiten entre animales
          y personas.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6">
              <span className="inline-flex rounded-xl bg-teal-50 p-3 text-teal-700">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quiénes somos: misión, visión, valores, equipo */}
      <AboutSection />

      {/* Adopta */}
      <section id="adopta" className="scroll-mt-20 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Te están esperando
              </h2>
              <p className="mt-2 text-slate-600">
                Animales habilitados por nuestros veterinarios para adopción.
              </p>
            </div>
            <Link
              href={adoptHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
            >
              Ver todos <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-xl" />
              ))}
            {animals?.data.map((a) => (
              <AnimalCard
                key={a.id}
                animal={a}
                href={null}
                actions={
                  <Link
                    href={adoptHref}
                    className="inline-flex h-9 items-center rounded-lg bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Quiero adoptarlo
                  </Link>
                }
              />
            ))}
          </div>
          {animals && animals.data.length === 0 && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
              <EmptyState
                title="Por ahora no hay animales publicados"
                description="Vuelve pronto o escríbenos para más información."
              />
            </div>
          )}
        </div>
      </section>

      {/* Cómo adoptar */}
      <section id="como-adoptar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          ¿Cómo adoptar?
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-2xl border border-slate-200 p-6">
              <span className="absolute right-4 top-4 text-sm font-bold text-slate-300">
                0{i + 1}
              </span>
              <Icon className="h-7 w-7 text-teal-600" aria-hidden />
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-sm text-slate-500">
          La decisión de cada adopción la toma el personal de la institución tras evaluar a la
          familia.
        </p>
      </section>

      {/* Modelo de negocio */}
      <BusinessModelSection />

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="scroll-mt-20 bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            Preguntas frecuentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-slate-900">
                  {f.q}
                  <span
                    className="text-teal-600 transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Tienes otra duda? Pregúntale a nuestro <strong>asistente virtual</strong> (botón abajo
            a la derecha).
          </p>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Contáctame</h2>
            <p className="mt-2 text-slate-600">Escríbenos y te responderemos por correo.</p>
            {info && (
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-teal-600" aria-hidden /> {info.address}
                </li>
                <li className="flex gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-teal-600" aria-hidden /> {info.phone}
                </li>
                <li className="flex gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-teal-600" aria-hidden /> {info.email}
                </li>
                <li className="flex gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-teal-600" aria-hidden /> {info.hours}
                </li>
              </ul>
            )}
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-slate-900">Síguenos</p>
              <SocialLinks social={info?.social} variant="light" showLabels />
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
