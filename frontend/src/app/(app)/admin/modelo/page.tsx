"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Play, TriangleAlert } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ErrorState, PageSkeleton } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";
import {
  useMlModels,
  useMlMutations,
  useMlStatus,
  type MlCrossValidation,
  type MlModelRow,
  type MlSource,
  type TrainingReport,
} from "@/hooks/use-ml";

const SOURCE_LABEL: Record<MlSource, string> = {
  REAL: "Datos reales",
  SINTETICO: "Datos sintéticos",
  MIXTO: "Mixto",
};

const SOURCE_TONE: Record<MlSource, "green" | "amber" | "slate"> = {
  REAL: "green",
  SINTETICO: "amber",
  MIXTO: "amber",
};

const pct = (n: number) => `${formatNumber(n * 100, 2)} %`;

/** Tabla comparativa: es el resultado que va al documento. */
function ComparisonTable({ report }: { report: TrainingReport }) {
  const rows: { label: string; cv: MlCrossValidation }[] = [
    { label: "Random Forest", cv: report.forest },
    { label: "Regresión logística (base)", cv: report.logistic },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">Modelo</th>
            <th className="py-2 pr-4 text-right font-medium">Exactitud</th>
            <th className="py-2 pr-4 text-right font-medium">ROC-AUC</th>
            <th className="py-2 pr-4 text-right font-medium">Precisión</th>
            <th className="py-2 pr-4 text-right font-medium">Exhaustividad</th>
            <th className="py-2 pr-4 text-right font-medium">F1</th>
            <th className="py-2 text-right font-medium">Brier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, cv }) => (
            <tr key={label} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 font-medium text-slate-800">{label}</td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {formatNumber(cv.pooled.accuracy, 4)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {formatNumber(cv.pooled.rocAuc, 4)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {formatNumber(cv.pooled.precision, 4)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {formatNumber(cv.pooled.recall, 4)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(cv.pooled.f1, 4)}</td>
              <td className="py-2 text-right tabular-nums">{formatNumber(cv.pooled.brier, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Validación cruzada estratificada de {report.forest.folds} pliegues. Brier mide calibración
        de la probabilidad: menor es mejor.
      </p>
    </div>
  );
}

function ConfusionMatrix({ cv }: { cv: MlCrossValidation }) {
  const c = cv.pooled.confusion;
  return (
    <table className="text-sm">
      <thead>
        <tr className="text-xs text-slate-500">
          <th />
          <th className="px-3 py-1 font-medium">Predijo éxito</th>
          <th className="px-3 py-1 font-medium">Predijo fracaso</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th className="pr-3 text-right text-xs font-medium text-slate-500">Éxito real</th>
          <td className="bg-green-50 px-3 py-2 text-center tabular-nums">{c.truePositives}</td>
          <td className="bg-red-50 px-3 py-2 text-center tabular-nums">{c.falseNegatives}</td>
        </tr>
        <tr>
          <th className="pr-3 text-right text-xs font-medium text-slate-500">Fracaso real</th>
          <td className="bg-red-50 px-3 py-2 text-center tabular-nums">{c.falsePositives}</td>
          <td className="bg-green-50 px-3 py-2 text-center tabular-nums">{c.trueNegatives}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Importances({ report }: { report: TrainingReport }) {
  const max = report.importances[0]?.importance || 1;
  return (
    <ul className="space-y-2">
      {report.importances.slice(0, 10).map((f) => (
        <li key={f.feature}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-800">{f.label}</span>
            <span className="shrink-0 tabular-nums text-slate-600">{pct(f.importance)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${(f.importance / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function MlModelPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const status = useMlStatus();
  const models = useMlModels();
  const { train, activate, deactivate } = useMlMutations();

  const [onlyReal, setOnlyReal] = useState(true);
  const [syntheticSize, setSyntheticSize] = useState(1500);
  const [nTrees, setNTrees] = useState(150);
  const [folds, setFolds] = useState(5);
  const [seed, setSeed] = useState(2026);
  const [notes, setNotes] = useState("");
  const [lastReport, setLastReport] = useState<TrainingReport | null>(null);

  if (status.isPending) return <PageSkeleton />;
  if (status.error)
    return <ErrorState message={errorMessage(status.error)} onRetry={() => void status.refetch()} />;

  const s = status.data;
  const report = lastReport ?? s.activeMetrics;

  const onTrain = async () => {
    try {
      const result = await train.mutateAsync({
        useSynthetic: !onlyReal,
        ...(onlyReal ? {} : { syntheticSize }),
        nTrees,
        folds,
        seed,
        activate: true,
        notes: notes.trim() || undefined,
      });
      setLastReport(result);
      toast.success(`Modelo v${result.version} entrenado y activado`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const columns: Column<MlModelRow>[] = [
    { key: "version", header: "Versión", cell: (m) => `v${m.version}` },
    {
      key: "source",
      header: "Procedencia",
      cell: (m) => <Badge tone={SOURCE_TONE[m.source]}>{SOURCE_LABEL[m.source]}</Badge>,
    },
    {
      key: "dataset",
      header: "Conjunto",
      cell: (m) => `${m.datasetSize} (${m.realSamples} reales / ${m.syntheticSamples} sint.)`,
    },
    { key: "seed", header: "Semilla", cell: (m) => String(m.seed) },
    { key: "createdAt", header: "Entrenado", cell: (m) => formatDateTime(m.createdAt) },
    { key: "createdBy", header: "Por", cell: (m) => m.createdBy.fullName },
    {
      key: "state",
      header: "Estado",
      cell: (m) =>
        m.isActive ? (
          <Badge tone="green">Activo</Badge>
        ) : isAdmin ? (
          <Button
            variant="outline"
            size="sm"
            loading={activate.isPending}
            onClick={() => {
              activate
                .mutateAsync(m.version)
                .then(() => toast.success(`Modelo v${m.version} activado`))
                .catch((err: unknown) => toast.error(errorMessage(err)));
            }}
          >
            Activar
          </Button>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Modelo de recomendación"
        description="Random Forest entrenado sobre las solicitudes resueltas (CU13)."
      />

      <div className="space-y-6">
        {/* ------------------------------------------------------- Estado */}
        <Card>
          <CardHeader
            title="Estado actual"
            actions={
              s.hasActiveModel && isAdmin ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={deactivate.isPending}
                  onClick={() => {
                    deactivate
                      .mutateAsync()
                      .then(() => toast.success("Modelo desactivado: se vuelve al motor de reglas"))
                      .catch((err: unknown) => toast.error(errorMessage(err)));
                  }}
                >
                  Desactivar
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {s.hasActiveModel ? (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Modelo activo</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    Random Forest v{s.activeVersion}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Procedencia del conjunto</dt>
                  <dd className="text-sm">
                    {s.activeSource && (
                      <Badge tone={SOURCE_TONE[s.activeSource]}>
                        {SOURCE_LABEL[s.activeSource]}
                      </Badge>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Entrenado</dt>
                  <dd className="text-sm text-slate-900">
                    {s.trainedAt ? formatDateTime(s.trainedAt) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Por</dt>
                  <dd className="text-sm text-slate-900">{s.trainedBy ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-600">
                No hay ningún modelo activo. Las recomendaciones se calculan con el{" "}
                <strong>motor de reglas</strong> (suma ponderada), que es el comportamiento de
                arranque en frío.
              </p>
            )}

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                Solicitudes resueltas disponibles para entrenar:{" "}
                <strong className="tabular-nums">{s.realSamplesAvailable}</strong> de las{" "}
                <strong className="tabular-nums">{s.minRealSamplesRecommended}</strong>{" "}
                recomendadas. Variables del modelo:{" "}
                <strong className="tabular-nums">{s.featureCount}</strong>.
              </p>
              {s.realSamplesAvailable < s.minRealSamplesRecommended && s.activeSource !== "REAL" && (
                <p className="mt-2 flex items-start gap-2 text-amber-800">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Hay pocos casos reales, así que el entrenamiento se completa con casos
                  sintéticos generados a partir de criterios de idoneidad. Sirve para validar el
                  circuito, no para afirmar capacidad predictiva real.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* --------------------------------------------------- Entrenamiento */}
        {isAdmin && (
          <Card>
            <CardHeader title="Entrenar un modelo nuevo" />
            <CardBody>
              <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-teal-600"
                  checked={onlyReal}
                  onChange={(e) => setOnlyReal(e.target.checked)}
                />
                Entrenar solo con las solicitudes resueltas registradas en el sistema
              </label>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Casos sintéticos" hint="100 a 20 000">
                  <Input
                    type="number"
                    min={100}
                    max={20000}
                    disabled={onlyReal}
                    value={syntheticSize}
                    onChange={(e) => setSyntheticSize(Number(e.target.value))}
                  />
                </FormField>
                <FormField label="Árboles" hint="10 a 500">
                  <Input
                    type="number"
                    min={10}
                    max={500}
                    value={nTrees}
                    onChange={(e) => setNTrees(Number(e.target.value))}
                  />
                </FormField>
                <FormField label="Pliegues" hint="Validación cruzada, 2 a 10">
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={folds}
                    onChange={(e) => setFolds(Number(e.target.value))}
                  />
                </FormField>
                <FormField label="Semilla" hint="Fija el azar: reproducible">
                  <Input
                    type="number"
                    min={1}
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                  />
                </FormField>
              </div>
              <div className="mt-4">
                <FormField label="Nota (opcional)">
                  <Input
                    value={notes}
                    maxLength={500}
                    placeholder="Por ejemplo: reentrenamiento tras cargar las adopciones de noviembre"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button loading={train.isPending} onClick={() => void onTrain()}>
                  <Play className="h-4 w-4" aria-hidden />
                  Entrenar y activar
                </Button>
                <p className="text-xs text-slate-500">
                  Cada entrenamiento crea una versión nueva; las anteriores quedan y se pueden
                  reactivar.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* --------------------------------------------------------- Métricas */}
        {report && (
          <>
            {report.warnings.length > 0 && (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                role="note"
              >
                <p className="flex items-center gap-2 font-medium">
                  <TriangleAlert className="h-4 w-4" aria-hidden />
                  Advertencias metodológicas
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {report.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <Card>
              <CardHeader
                title={`Comparación de modelos — v${report.version}`}
                description={`Conjunto de ${report.datasetSize} casos (${report.realSamples} reales, ${report.syntheticSamples} sintéticos); clase positiva ${pct(report.positiveRate)}.`}
              />
              <CardBody className="space-y-6">
                <ComparisonTable report={report} />

                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-800">
                      Matriz de confusión — Random Forest
                    </p>
                    <ConfusionMatrix cv={report.forest} />
                    <dl className="mt-3 space-y-1 text-xs text-slate-600">
                      <div className="flex gap-2">
                        <dt>Exactitud entre pliegues:</dt>
                        <dd className="tabular-nums">
                          {formatNumber(report.forest.accuracyMean, 4)} ±{" "}
                          {formatNumber(report.forest.accuracyStd, 4)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt>Exactitud out-of-bag:</dt>
                        <dd className="tabular-nums">
                          {report.oobScore === null ? "n/d" : formatNumber(report.oobScore, 4)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt>Estructura:</dt>
                        <dd className="tabular-nums">
                          {report.structure.trees} árboles, profundidad media{" "}
                          {report.structure.avgDepth}, {report.structure.avgLeaves} hojas por árbol
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt>Semilla:</dt>
                        <dd className="tabular-nums">{report.seed}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-800">
                      Importancia de variables
                    </p>
                    <Importances report={report} />
                    <p className="mt-2 text-xs text-slate-500">
                      Reducción media de impureza de Gini. Indica qué variables usa más el bosque
                      en general, no el peso en un caso puntual.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {/* --------------------------------------------------------- Historial */}
        <Card>
          <CardHeader title="Historial de modelos" description={`${s.totalModels} en total.`} />
          <CardBody>
            <DataTable<MlModelRow>
              columns={columns}
              data={models.data}
              rowKey={(m) => String(m.version)}
              loading={models.isPending}
              error={models.error ? errorMessage(models.error) : null}
              emptyTitle="Todavía no se entrenó ningún modelo"
              emptyDescription="Entrena el primero con el formulario de arriba."
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
