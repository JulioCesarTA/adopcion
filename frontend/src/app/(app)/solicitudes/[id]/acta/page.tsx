"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, PawPrint, Printer } from "lucide-react";
import { ErrorState, PageSkeleton } from "@/components/info";
import { Button } from "@/components/ui/button";
import { useAct } from "@/hooks/use-adoptions";
import { errorMessage } from "@/lib/api";
import { animalName, formatAge, HOUSING, SEX, SIZE, SPECIES } from "@/lib/labels";
import { formatDate, formatDay } from "@/lib/utils";

/** CU26: acta de adopción imprimible (no se guarda archivo en v1). */
export default function ActPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useAct(id);

  if (isLoading) return <PageSkeleton />;
  if (error || !data)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  const { animal, adopter, request } = data;
  const rabies = animal.vaccinations.find((v) => v.vaccine.isRabies);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          href={`/solicitudes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a la solicitud
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Imprimir acta
        </Button>
      </div>

      <article className="act mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-[15px] leading-relaxed text-slate-900 shadow-sm sm:p-12">
        <header className="flex items-center justify-between gap-4 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white print:border print:border-slate-900 print:bg-white print:text-slate-900">
              <PawPrint className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">{data.institution}</p>
              <p className="text-sm text-slate-500">Santa Cruz de la Sierra, Bolivia</p>
            </div>
          </div>
          <p className="text-right text-sm text-slate-500">
            N.º {data.actNumber}
            <br />
            Fecha: {formatDate(request.deliveryDate ?? request.decisionDate)}
          </p>
        </header>

        <h1 className="mt-6 text-center text-xl font-bold uppercase tracking-wide">
          Acta de adopción responsable
        </h1>

        <p className="mt-6">
          En la ciudad de Santa Cruz de la Sierra, en fecha{" "}
          {formatDate(request.deliveryDate ?? request.decisionDate)}, la {data.institution} entrega
          en adopción al animal descrito a continuación a la persona identificada como adoptante,
          quien acepta los compromisos de tenencia responsable detallados en esta acta.
        </p>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            Datos del animal
          </h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ["Código", animal.code],
                ["Nombre", animalName(animal)],
                [
                  "Especie / raza",
                  `${SPECIES[animal.species]}${animal.breed ? ` / ${animal.breed}` : ""}`,
                ],
                ["Sexo / tamaño", `${SEX[animal.sex]} / ${SIZE[animal.size]}`],
                ["Edad aproximada", formatAge(animal.ageMonths)],
                ["Color", animal.color ?? "—"],
                [
                  "Vacuna antirrábica",
                  rabies ? `Aplicada el ${formatDay(rabies.applicationDate)}` : "Sin registro",
                ],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-slate-200">
                  <th className="w-48 py-1.5 pr-4 text-left font-medium text-slate-600">{k}</th>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            Datos del adoptante
          </h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ["Nombre completo", `${adopter.firstName} ${adopter.lastName}`],
                ["Cédula de identidad", adopter.ci],
                ["Teléfono", adopter.phone],
                ["Correo", adopter.email ?? "—"],
                ["Dirección", adopter.address ?? "—"],
                ["Tipo de vivienda", HOUSING[adopter.profile.housingType]],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-slate-200">
                  <th className="w-48 py-1.5 pr-4 text-left font-medium text-slate-600">{k}</th>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            Compromisos de tenencia responsable
          </h2>
          <p>El adoptante se compromete a:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            {data.commitments.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </section>

        <section className="mt-16 grid grid-cols-2 gap-12 text-center text-sm">
          <div>
            <div className="border-t border-slate-900 pt-2">
              <p className="font-medium">
                {adopter.firstName} {adopter.lastName}
              </p>
              <p className="text-slate-500">Adoptante · CI {adopter.ci}</p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-900 pt-2">
              <p className="font-medium">{request.responsible.fullName}</p>
              <p className="text-slate-500">Responsable de la institución</p>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
