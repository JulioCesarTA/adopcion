"use client";

import { useEffect, useState } from "react";
import { Home, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AnimalCard } from "@/components/animals/animal-card";
import { ErrorState } from "@/components/info";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMyAdopterProfile,
  useMyRecommendations,
  useSaveMyAdopterProfile,
  type MyAdopterProfile,
} from "@/hooks/use-my-adopter";
import { errorMessage } from "@/lib/api";
import { EXPERIENCE, HOUSING, LEVEL, SIZE, SPECIES, options } from "@/lib/labels";
import type { AnimalListItem } from "@/lib/types";

const EMPTY: MyAdopterProfile = {
  housingType: "CASA_CON_PATIO",
  hasYard: true,
  hasChildren: false,
  hasOtherAnimals: false,
  availableHoursPerDay: 3,
  experience: "BASICA",
  preferredSpecies: null,
  preferredSize: null,
};

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-teal-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function HomeForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: MyAdopterProfile;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState(initial);
  const save = useSaveMyAdopterProfile();
  const set = <K extends keyof MyAdopterProfile>(k: K, v: MyAdopterProfile[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    try {
      await save.mutateAsync(f);
      toast.success("Datos de tu hogar guardados");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader
        title="Cuéntanos sobre tu hogar"
        description="Con estos datos calculamos qué animales son más compatibles contigo."
      />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Tipo de vivienda" required>
            <Select
              value={f.housingType}
              onChange={(e) => set("housingType", e.target.value as MyAdopterProfile["housingType"])}
            >
              {options(HOUSING).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Horas disponibles por día" hint="Para paseos, juego y cuidados" required>
            <Input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={f.availableHoursPerDay}
              onChange={(e) => set("availableHoursPerDay", Number(e.target.value))}
            />
          </FormField>
          <FormField label="Experiencia con mascotas" required>
            <Select
              value={f.experience}
              onChange={(e) => set("experience", e.target.value as MyAdopterProfile["experience"])}
            >
              {options(EXPERIENCE).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Especie preferida">
            <Select
              value={f.preferredSpecies ?? ""}
              onChange={(e) =>
                set("preferredSpecies", (e.target.value || null) as MyAdopterProfile["preferredSpecies"])
              }
            >
              <option value="">Sin preferencia</option>
              {options(SPECIES).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Tamaño preferido">
            <Select
              value={f.preferredSize ?? ""}
              onChange={(e) =>
                set("preferredSize", (e.target.value || null) as MyAdopterProfile["preferredSize"])
              }
            >
              <option value="">Sin preferencia</option>
              {options(SIZE).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Check label="Tengo patio" checked={f.hasYard} onChange={(v) => set("hasYard", v)} />
          <Check label="Hay niños en casa" checked={f.hasChildren} onChange={(v) => set("hasChildren", v)} />
          <Check
            label="Tengo otros animales"
            checked={f.hasOtherAnimals}
            onChange={(v) => set("hasOtherAnimals", v)}
          />
        </div>
        <div className="flex gap-2">
          <Button loading={save.isPending} onClick={() => void submit()}>
            <Sparkles className="h-4 w-4" aria-hidden /> Ver mis recomendaciones
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** Recomendaciones del modelo para el adoptante, a partir de los datos de su hogar. */
export function MyRecommendationsSection({
  renderActions,
}: {
  renderActions: (animal: AnimalListItem) => React.ReactNode;
}) {
  const profile = useMyAdopterProfile(true);
  const [editing, setEditing] = useState(false);
  const hasProfile = !!profile.data;
  const recs = useMyRecommendations(hasProfile && !editing);

  useEffect(() => {
    if (profile.isSuccess && !profile.data) setEditing(true);
  }, [profile.isSuccess, profile.data]);

  if (profile.isPending) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (profile.error)
    return <ErrorState message={errorMessage(profile.error)} onRetry={() => void profile.refetch()} />;

  if (editing || !profile.data)
    return (
      <HomeForm
        initial={profile.data ?? EMPTY}
        onDone={() => setEditing(false)}
        onCancel={profile.data ? () => setEditing(false) : undefined}
      />
    );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-teal-600" aria-hidden /> Recomendados para ti
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ordenados por compatibilidad con tu hogar, según nuestro modelo de recomendación.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Home className="h-4 w-4" aria-hidden /> Editar datos de mi hogar
        </Button>
      </div>

      {recs.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : recs.error ? (
        <ErrorState message={errorMessage(recs.error)} onRetry={() => void recs.refetch()} />
      ) : !recs.data.data.length ? (
        <Card className="p-6 text-sm text-slate-600">
          Por ahora no hay animales disponibles compatibles con tu hogar. Vuelve a revisar pronto.
        </Card>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recs.data.data.slice(0, 6).map((r) => (
              <AnimalCard
                key={r.animal.id}
                animal={r.animal}
                href={null}
                actions={
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={LEVEL[r.level].tone}>
                        Compatibilidad {LEVEL[r.level].label.toLowerCase()}
                      </Badge>
                      <span className="text-lg font-semibold tabular-nums text-slate-900">
                        {Math.round(r.score)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{ width: `${Math.max(0, Math.min(100, r.score))}%` }}
                      />
                    </div>
                    {r.reasons.length > 0 && (
                      <p className="text-xs text-slate-500">A favor: {r.reasons.join(" · ")}</p>
                    )}
                    {renderActions(r.animal)}
                  </div>
                }
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">{recs.data.disclaimer}</p>
        </>
      )}
    </section>
  );
}
