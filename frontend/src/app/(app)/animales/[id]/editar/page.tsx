"use client";

import { use } from "react";
import { AnimalForm } from "@/components/animals/animal-form";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { useAnimal } from "@/hooks/use-animals";
import { errorMessage } from "@/lib/api";
import { animalName } from "@/lib/labels";

export default function EditAnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: animal, isLoading, error, refetch } = useAnimal(id);

  if (isLoading) return <PageSkeleton />;
  if (error || !animal)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader title={`Editar: ${animalName(animal)}`} description={animal.code} />
      <AnimalForm animal={animal} />
    </>
  );
}
