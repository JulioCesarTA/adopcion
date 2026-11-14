"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClipboardList, Heart, HeartHandshake, PawPrint, ShieldAlert } from "lucide-react";
import { AlertsList } from "@/components/alerts-list";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/info";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-admin";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHART, axisProps, seriesColor, tooltipProps } from "@/lib/chart";
import { ANIMAL_STATUS, animalName } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/roles";
import type { Section } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function sectionError<T>(s: Section<T> | null | undefined): string | null {
  return s && !s.ok ? s.error : null;
}

/** CU18: panel de indicadores. Cada tarjeta muestra su propio error sin romper el resto. */
export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();

  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  const cards = data?.cards.ok ? data.cards.data : undefined;
  const cardsError = sectionError(data?.cards);

  return (
    <>
      <PageHeader
        title={user ? `Hola, ${user.fullName.split(" ")[0]}` : "Panel"}
        description={user ? `Panel de indicadores · ${ROLE_LABELS[user.role]}` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="En la institución"
          value={cards?.inInstitution}
          icon={PawPrint}
          loading={isLoading}
          error={cardsError}
        />
        <StatCard
          label="En cuarentena / observación"
          value={cards?.inQuarantine}
          icon={ShieldAlert}
          tone="red"
          loading={isLoading}
          error={cardsError}
        />
        <StatCard
          label="Disponibles para adopción"
          value={cards?.available}
          icon={Heart}
          tone="green"
          loading={isLoading}
          error={cardsError}
        />
        <StatCard
          label="Solicitudes activas"
          value={cards?.activeRequests}
          icon={ClipboardList}
          tone="blue"
          loading={isLoading}
          error={cardsError}
        />
        <StatCard
          label="Adopciones del mes"
          value={cards?.adoptionsThisMonth}
          icon={HeartHandshake}
          tone="amber"
          loading={isLoading}
          error={cardsError}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Animales por estado" />
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : !data?.byStatus.ok ? (
              <ErrorState message={sectionError(data?.byStatus) ?? "Error"} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.byStatus.data.map((r) => ({
                    ...r,
                    label: ANIMAL_STATUS[r.status].label,
                  }))}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                  barCategoryGap={6}
                >
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" allowDecimals={false} {...axisProps} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={170}
                    {...axisProps}
                    axisLine={false}
                  />
                  <Tooltip {...tooltipProps} formatter={(v) => [String(v), "Animales"]} />
                  <Bar
                    dataKey="count"
                    name="Animales"
                    fill={CHART.single}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ingresos vs. adopciones" description="Últimos 6 meses" />
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : !data?.entriesVsAdoptions.ok ? (
              <ErrorState message={sectionError(data?.entriesVsAdoptions) ?? "Error"} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={data.entriesVsAdoptions.data}
                  margin={{ left: -16, right: 16, top: 8, bottom: 4 }}
                >
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
                  <Tooltip
                    {...tooltipProps}
                    cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }}
                  />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, color: CHART.text }} />
                  <Line
                    type="monotone"
                    dataKey="entries"
                    name="Ingresos"
                    stroke={seriesColor(0)}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: CHART.surface }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="adoptions"
                    name="Adopciones"
                    stroke={seriesColor(1)}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: CHART.surface }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Alertas"
            actions={
              <Link href="/alertas" className="text-sm font-medium text-teal-700 hover:underline">
                Ver todas
              </Link>
            }
          />
          {isLoading ? (
            <div className="p-5">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : data?.alerts.ok ? (
            <AlertsList alerts={data.alerts.data} limit={6} />
          ) : (
            <ErrorState message={sectionError(data?.alerts) ?? "Error"} />
          )}
        </Card>

        {data?.latestRequests !== null && (
          <Card>
            <CardHeader
              title="Últimas solicitudes"
              actions={
                <Link
                  href="/solicitudes"
                  className="text-sm font-medium text-teal-700 hover:underline"
                >
                  Ver todas
                </Link>
              }
            />
            {isLoading ? (
              <div className="p-5">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : data?.latestRequests?.ok ? (
              data.latestRequests.data.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.latestRequests.data.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/solicitudes/${r.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {animalName(r.animal)} → {r.adopterProfile.person.firstName}{" "}
                            {r.adopterProfile.person.lastName}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {formatDate(r.requestDate)}
                          </span>
                        </span>
                        <StatusBadge kind="request" value={r.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Aún no hay solicitudes" />
              )
            ) : (
              <ErrorState message={sectionError(data?.latestRequests) ?? "Error"} />
            )}
          </Card>
        )}
      </div>
    </>
  );
}
