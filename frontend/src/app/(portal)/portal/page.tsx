"use client";

import { useRef, useState } from "react";
import { Heart } from "lucide-react";
import { AnimalCard } from "@/components/animals/animal-card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/public/contact-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAnimals, type PublicAnimal } from "@/hooks/use-public";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { animalName, SIZE, SPECIES, options } from "@/lib/labels";

/** Portal del cliente: catálogo de adoptables + contacto para expresar interés. */
export default function PortalHome() {
  const { user } = useAuth();
  const [species, setSpecies] = useState("");
  const [size, setSize] = useState("");
  const [page, setPage] = useState(1);
  const [interest, setInterest] = useState<PublicAnimal | null>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error, refetch } = usePublicAnimals({
    species,
    size,
    page,
    pageSize: 9,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1;

  const showInterest = (a: PublicAnimal) => {
    setInterest(a);
    setTimeout(() => contactRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <>
      <PageHeader
        title="Animales en adopción"
        description="Elige al compañero que buscas y cuéntanos tu interés: el personal te contactará para la entrevista."
      />
      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:w-fit lg:grid-cols-[auto_auto]">
        <Select
          aria-label="Especie"
          value={species}
          onChange={(e) => {
            setSpecies(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las especies</option>
          {options(SPECIES).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Tamaño"
          value={size}
          onChange={(e) => {
            setSize(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los tamaños</option>
          {options(SIZE).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Card>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : !data?.data.length ? (
        <Card>
          <EmptyState icon={Heart} title="No hay animales disponibles con estos filtros" />
        </Card>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((a) => (
              <AnimalCard
                key={a.id}
                animal={a}
                href={null}
                actions={
                  <Button size="sm" onClick={() => showInterest(a)}>
                    <Heart className="h-4 w-4" aria-hidden /> Me interesa
                  </Button>
                }
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <div ref={contactRef} className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-semibold text-slate-900">
          {interest ? `Quiero adoptar a ${animalName(interest)}` : "¿Tienes alguna consulta?"}
        </h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Te responderemos por correo. La decisión de cada adopción la toma el personal tras una
          entrevista.
        </p>
        <ContactForm
          key={interest?.id ?? "general"}
          initial={{
            name: user?.fullName ?? "",
            email: user?.email ?? "",
            phone: user?.phone ?? "",
            ...(interest
              ? {
                  subject: `Interés en adoptar a ${animalName(interest)} (${interest.code})`,
                  message: `Hola, me interesa adoptar a ${animalName(interest)} (${interest.code}). Quisiera coordinar una entrevista.`,
                }
              : {}),
          }}
        />
      </div>
    </>
  );
}
