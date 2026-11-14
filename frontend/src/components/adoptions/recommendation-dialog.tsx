"use client";

import { useState } from "react";
import Link from "next/link";
import { BreakdownDetail, Disclaimer, ScoreBar } from "@/components/score-bar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { usePairRecommendation } from "@/hooks/use-adoptions";
import { errorMessage } from "@/lib/api";
import { animalName } from "@/lib/labels";
import type { Adopter, AnimalListItem } from "@/lib/types";
import { AdopterPicker } from "./pickers";

/** CU13 modo 2 desde el catálogo de adoptables: elegir adoptante y calcular el par. */
export function RecommendationDialog({
  animal,
  onClose,
}: {
  animal: AnimalListItem;
  onClose: () => void;
}) {
  const [adopter, setAdopter] = useState<Adopter | null>(null);
  const pair = usePairRecommendation();

  const calculate = (a: Adopter) => {
    setAdopter(a);
    pair.mutate({ adopterId: a.id, animalId: animal.id });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Compatibilidad con ${animalName(animal)}`}
      description="Selecciona un adoptante para calcular el puntaje."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {adopter && pair.data && pair.data.level !== "INCOMPATIBLE" && (
            <Link
              href={`/solicitudes/nueva?adopterId=${adopter.id}&animalId=${animal.id}`}
              className="inline-flex h-10 items-center rounded-lg bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700"
            >
              Solicitar adopción
            </Link>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <AdopterPicker value={adopter} onChange={calculate} />
        {pair.isPending && <p className="text-sm text-slate-500">Calculando…</p>}
        {pair.error && (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage(pair.error)}
          </p>
        )}
        {pair.data && adopter && (
          <div className="space-y-4 rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">
              {adopter.person.firstName} {adopter.person.lastName}
            </p>
            <ScoreBar score={pair.data.score} level={pair.data.level} />
            <BreakdownDetail breakdown={pair.data.breakdown} />
            <Disclaimer />
          </div>
        )}
      </div>
    </Dialog>
  );
}
