"use client";

import { use } from "react";
import { AdopterForm } from "@/components/adoptions/adopter-form";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { useAdopter } from "@/hooks/use-adoptions";
import { errorMessage } from "@/lib/api";

export default function EditAdopterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useAdopter(id);
  if (isLoading) return <PageSkeleton />;
  if (error || !data)
    return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  return (
    <>
      <PageHeader title={`Editar: ${data.person.firstName} ${data.person.lastName}`} />
      <AdopterForm adopter={data} />
    </>
  );
}
