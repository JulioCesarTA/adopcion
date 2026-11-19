"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AdoptableAnimalPicker, AdopterPicker } from "@/components/adoptions/pickers";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { useAdopter, useAdoptionMutations } from "@/hooks/use-adoptions";
import { useAnimal } from "@/hooks/use-animals";
import { errorMessage } from "@/lib/api";
import { animalName } from "@/lib/labels";
import type { Adopter, AnimalListItem } from "@/lib/types";

/** CU11: elegir adoptante → elegir animal disponible → crear solicitud. */
function NewRequest() {
  const router = useRouter();
  const params = useSearchParams();
  const [adopter, setAdopter] = useState<Adopter | null>(null);
  const [animal, setAnimal] = useState<AnimalListItem | null>(null);
  const [notes, setNotes] = useState("");
  const { create } = useAdoptionMutations();

  // Preselección desde el catálogo
  const preAdopter = useAdopter(params.get("adopterId") ?? "");
  const preAnimal = useAnimal(params.get("animalId") ?? "");
  useEffect(() => {
    if (preAdopter.data && !adopter) setAdopter(preAdopter.data);
  }, [preAdopter.data, adopter]);
  useEffect(() => {
    if (preAnimal.data && !animal && preAnimal.data.status === "DISPONIBLE_ADOPCION")
      setAnimal(preAnimal.data);
  }, [preAnimal.data, animal]);

  const submit = async () => {
    if (!adopter || !animal) return;
    try {
      const r = await create.mutateAsync({
        adopterId: adopter.id,
        animalId: animal.id,
        notes: notes.trim() || undefined,
      });
      toast.success("Solicitud creada. El animal pasó a «En proceso de adopción».");
      router.push(`/solicitudes/${r.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Nueva solicitud de adopción"
        description="Solo se pueden solicitar animales disponibles para adopción."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="1. Adoptante"
            description={
              adopter
                ? `${adopter.person.firstName} ${adopter.person.lastName}`
                : "Selecciona un adoptante"
            }
          />
          <CardBody>
            <AdopterPicker value={adopter} onChange={setAdopter} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="2. Animal"
            description={
              animal ? `${animalName(animal)} (${animal.code})` : "Selecciona un animal disponible"
            }
          />
          <CardBody>
            <AdoptableAnimalPicker value={animal} onChange={setAnimal} />
          </CardBody>
        </Card>
      </div>

      {adopter && animal && (
        <Card className="mt-6">
          <CardHeader title="3. Revisión" />
          <CardBody className="space-y-4">
            <FormField label="Notas iniciales" hint="Opcional">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button onClick={() => void submit()} loading={create.isPending}>
                Crear solicitud
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={null}>
      <NewRequest />
    </Suspense>
  );
}
