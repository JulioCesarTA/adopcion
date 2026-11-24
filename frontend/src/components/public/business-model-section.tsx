import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Gift,
  HeartHandshake,
  Receipt,
  RefreshCw,
  Syringe,
} from "lucide-react";

/** Ciclo del modelo: la adopción atrae familias y la cita clínica es el servicio que se repite. */
const CYCLE = [
  {
    icon: Gift,
    title: "Adoptas sin costo",
    text: "Encuentras a tu compañero en el catálogo. La adopción no tiene costo para el adoptante.",
    tone: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  },
  {
    icon: HeartHandshake,
    title: "Nace una familia",
    text: "Tu mascota llega con su historia clínica digital, lista para cuidarla a tu lado.",
    tone: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  },
  {
    icon: CalendarCheck,
    title: "Reservas su cita",
    text: "Eliges día y hora desde el portal, sin hacer fila. Este es nuestro servicio de pago.",
    tone: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/30",
  },
  {
    icon: RefreshCw,
    title: "Vuelves cada año",
    text: "La vacunación antirrábica se renueva cada año y tu historial queda siempre a mano.",
    tone: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  },
];

const FACTS = [
  { n: "≈ 500 000", l: "perros y gatos viven en el municipio", src: "El Deber, 2026" },
  { n: "Bs 1 000", l: "de multa por cada mascota sin vacunar, desde el 21 de nov. 2026", src: "Red Uno, 2026" },
  { n: "1 vez al año", l: "se exige la vacuna antirrábica", src: null },
  { n: "1 servicio", l: "de pago: la cita clínica reservada en línea", src: null },
];

/**
 * «Cómo nos sostenemos»: explica, sin letra chica, de dónde salen los ingresos de Adopet.
 * Las cifras vienen del estudio de mercado; no se muestra ningún precio porque aún no hay cobro en línea.
 */
export function BusinessModelSection() {
  return (
    <section
      id="como-nos-sostenemos"
      className="relative scroll-mt-20 overflow-hidden bg-slate-900 py-20 text-white"
    >
      {/* Brillos de fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
            Cómo nos sostenemos
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Adoptar es gratis.{" "}
            <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
              Cuidarlo, un servicio justo.
            </span>
          </h2>
          <p className="mt-4 text-slate-300">
            Adopet gana con un solo servicio: la <strong className="text-white">cita clínica</strong>{" "}
            que reservan los dueños de mascotas. La adopción no cuesta, pero cada familia que adopta
            necesita vacunas, controles y consultas. Así el cuidado de los animales se sostiene solo.
          </p>
        </div>

        {/* Ciclo */}
        <ol className="mt-14 grid gap-4 md:grid-cols-4">
          {CYCLE.map(({ icon: Icon, title, text, tone }, i) => (
            <li
              key={title}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:bg-white/10"
            >
              <span className="absolute right-4 top-4 text-sm font-bold text-white/20">0{i + 1}</span>
              <span className={`inline-flex rounded-xl p-3 ring-1 ${tone}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p>
              {i < CYCLE.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 rounded-full bg-slate-900 p-1.5 text-teal-300 ring-1 ring-white/15 md:block"
                />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 text-teal-300" aria-hidden />
          El ciclo se repite: cada año, cada mascota.
        </p>

        {/* Gratis vs. de pago */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-transparent p-7">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-emerald-300">
              <Gift className="h-5 w-5" aria-hidden /> Lo que no tiene costo
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {[
                "Adoptar: la adopción no tiene costo para el adoptante.",
                "Ver el catálogo de animales evaluados por veterinarios.",
                "Preguntar al asistente virtual, a cualquier hora.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Algunos servicios asociados, como vacunas o esterilización, pueden tener un costo:
              consúltalo con la institución.
            </p>
          </article>

          <article className="rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-400/10 to-transparent p-7">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-teal-300">
              <Receipt className="h-5 w-5" aria-hidden /> Lo que sí es de pago
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {[
                "La cita clínica reservada en línea, con día y hora, sin hacer fila.",
                "Tu historial de vacunas y consultas siempre disponible para demostrar que tu mascota está al día.",
                "Un solo servicio de pago: sin suscripciones ni cargos escondidos.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Hoy el portal todavía no cobra en línea. Cuando se habilite, verás el precio final en
              bolivianos antes de confirmar cada cita.
            </p>
          </article>
        </div>

        {/* Por qué funciona */}
        <h3 className="mt-16 flex items-center justify-center gap-2 text-center text-2xl font-bold tracking-tight">
          <Syringe className="h-6 w-6 text-teal-300" aria-hidden /> Por qué hay una necesidad real
        </h3>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.l} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <dt className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-3xl font-extrabold text-transparent">
                {f.n}
              </dt>
              <dd className="mt-2 text-sm text-slate-300">{f.l}</dd>
              {f.src && <p className="mt-2 text-[11px] text-slate-500">Fuente: {f.src}</p>}
            </div>
          ))}
        </dl>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-400">
          Nuestro compromiso: sin costos ocultos y con la información clara antes de que decidas.
          Los términos del servicio se publican en{" "}
          <a href="/terminos" className="font-medium text-teal-300 underline">
            Términos y Condiciones
          </a>
          .
        </p>
      </div>
    </section>
  );
}
