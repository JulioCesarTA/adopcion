import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnimalStatus, Prisma, Species, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClinicalService } from '../clinical/clinical.service';
import { STATUS_LABELS } from '../animals/animal-status';
import { REQUEST_STATUS_LABELS } from '../adoptions/request-status';
import { addDays, diffDays, todayLaPaz } from '../../common/dates';
import { ReportFiltersDto } from './dto/reports.dto';

export type ReportCategory = 'GENERAL' | 'SANITARIO' | 'ADOPCIONES';
export type FilterKey = 'dates' | 'species' | 'status';
type Cell = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
}

export interface ReportChart {
  kind: 'bar' | 'line';
  xKey: string;
  series: { key: string; label: string }[];
  stacked?: boolean;
}

export interface ReportResult {
  type: string;
  title: string;
  description: string;
  filters: {
    from: string;
    to: string;
    species?: Species;
    status?: AnimalStatus;
  };
  columns: ReportColumn[];
  rows: Record<string, Cell>[];
  chart?: ReportChart;
  generatedAt: Date;
}

interface Range {
  from: string;
  to: string;
  fromTs: Date;
  toTs: Date;
}

interface ReportDefinition {
  type: string;
  title: string;
  description: string;
  category: ReportCategory;
  filters: FilterKey[];
  run: (
    r: Range,
    f: ReportFiltersDto,
  ) => Promise<Omit<ReportResult, 'type' | 'title' | 'description' | 'filters' | 'generatedAt'>>;
}

const SPECIES_LABELS: Record<Species, string> = {
  PERRO: 'Perro',
  GATO: 'Gato',
  OTRO: 'Otro',
};

/** Qué categorías de reportes ve cada rol (sección 3 / CU17). */
export const REPORT_ACCESS: Record<UserRole, ReportCategory[]> = {
  ADMIN: ['GENERAL', 'SANITARIO', 'ADOPCIONES'],
  DIRECTIVO: ['GENERAL', 'SANITARIO', 'ADOPCIONES'],
  VETERINARIO: ['GENERAL', 'SANITARIO'],
  GESTION: ['GENERAL', 'ADOPCIONES'],
  CLIENTE: [],
};

const dateOnly = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const laPazDate = (d: Date | null | undefined) =>
  d ? new Date(d.getTime() - 4 * 3_600_000).toISOString().slice(0, 10) : null;

/** Lista de meses 'YYYY-MM' entre dos fechas (inclusive). */
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number);
  const [ty, tm] = to.slice(0, 7).split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

const speciesSql = (s?: Species) => (s ? Prisma.sql`AND a.species = ${s}::species` : Prisma.empty);

/** Escapa un valor para CSV (separador ;, compatible con Excel en español). */
function csvCell(v: Cell): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@Injectable()
export class ReportsService {
  private readonly definitions: ReportDefinition[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly clinical: ClinicalService,
  ) {
    this.definitions = [
      {
        type: 'animales-estado-especie',
        title: 'Animales por estado y especie',
        description: 'Situación actual de los animales registrados (no usa el rango de fechas).',
        category: 'GENERAL',
        filters: ['species', 'status'],
        run: (_r, f) => this.animalsByStatusSpecies(f),
      },
      {
        type: 'ingresos-por-mes',
        title: 'Ingresos por mes',
        description: 'Animales ingresados a la institución por mes (fecha de ingreso).',
        category: 'GENERAL',
        filters: ['dates', 'species'],
        run: (r, f) => this.entriesByMonth(r, f),
      },
      {
        type: 'vacunaciones-por-periodo',
        title: 'Vacunaciones por periodo',
        description: 'Dosis aplicadas por mes y por vacuna.',
        category: 'SANITARIO',
        filters: ['dates', 'species'],
        run: (r, f) => this.vaccinationsByPeriod(r, f),
      },
      {
        type: 'vacunas-proximas',
        title: 'Vacunas próximas a vencer',
        description:
          'Última dosis de cada vacuna cuya próxima dosis vence en los próximos 30 días (o ya venció).',
        category: 'SANITARIO',
        filters: ['species'],
        run: (_r, f) => this.upcomingVaccines(f),
      },
      {
        type: 'tratamientos-activos',
        title: 'Tratamientos activos',
        description: 'Tratamientos en curso con su animal y veterinario responsable.',
        category: 'SANITARIO',
        filters: ['species'],
        run: (_r, f) => this.activeTreatments(f),
      },
      {
        type: 'animales-en-cuarentena',
        title: 'Animales en cuarentena / observación',
        description: 'Periodos activos con su duración y fecha estimada de fin.',
        category: 'SANITARIO',
        filters: ['species'],
        run: (_r, f) => this.inQuarantine(f),
      },
      {
        type: 'adopciones-por-mes',
        title: 'Adopciones por resultado y mes',
        description: 'Solicitudes cerradas por mes de decisión, según su resultado.',
        category: 'ADOPCIONES',
        filters: ['dates', 'species'],
        run: (r, f) => this.adoptionsByMonth(r, f),
      },
      {
        type: 'tiempo-promedio-adopcion',
        title: 'Tiempo promedio ingreso → adopción',
        description:
          'Días entre el ingreso y la entrega del animal en adopciones aprobadas en el periodo.',
        category: 'ADOPCIONES',
        filters: ['dates', 'species'],
        run: (r, f) => this.averageAdoptionTime(r, f),
      },
    ];
  }

  /** Reportes disponibles para el rol. */
  available(role: UserRole) {
    const allowed = REPORT_ACCESS[role];
    return this.definitions
      .filter((d) => allowed.includes(d.category))
      .map(({ type, title, description, category, filters }) => ({
        type,
        title,
        description,
        category,
        filters,
      }));
  }

  async run(type: string, f: ReportFiltersDto, role: UserRole): Promise<ReportResult> {
    const def = this.definitions.find((d) => d.type === type);
    if (!def) throw new NotFoundException('Reporte no encontrado');
    if (!REPORT_ACCESS[role].includes(def.category)) {
      throw new ForbiddenException('Tu rol no tiene acceso a este reporte');
    }
    const range = this.range(f);
    const result = await def.run(range, f);
    return {
      type: def.type,
      title: def.title,
      description: def.description,
      filters: {
        from: range.from,
        to: range.to,
        species: f.species,
        status: f.status,
      },
      generatedAt: new Date(),
      ...result,
    };
  }

  toCsv(report: ReportResult): string {
    const header = report.columns.map((c) => csvCell(c.label)).join(';');
    const lines = report.rows.map((row) =>
      report.columns.map((c) => csvCell(row[c.key] ?? null)).join(';'),
    );
    // BOM para que Excel reconozca UTF-8 (tildes y ñ)
    return '﻿' + [header, ...lines].join('\r\n') + '\r\n';
  }

  private range(f: ReportFiltersDto): Range {
    const today = todayLaPaz();
    const to = f.to?.slice(0, 10) ?? today;
    const from = f.from?.slice(0, 10) ?? `${addDays(to, -365).slice(0, 7)}-01`;
    if (from > to)
      throw new BadRequestException('Rango de fechas inválido: "desde" es posterior a "hasta"');
    if (diffDays(from, to) > 366 * 5) throw new BadRequestException('El rango máximo es de 5 años');
    return {
      from,
      to,
      fromTs: new Date(`${from}T00:00:00.000-04:00`),
      toTs: new Date(`${to}T23:59:59.999-04:00`),
    };
  }

  // ------------------------------------------------------------------

  private async animalsByStatusSpecies(f: ReportFiltersDto) {
    const rows = await this.prisma.animal.groupBy({
      by: ['status', 'species'],
      where: {
        deletedAt: null,
        ...(f.species ? { species: f.species } : {}),
        ...(f.status ? { status: f.status } : {}),
      },
      _count: { _all: true },
    });
    const statuses = f.status ? [f.status] : Object.values(AnimalStatus);
    const data = statuses.map((status) => {
      const row: Record<string, Cell> = { status: STATUS_LABELS[status] };
      let total = 0;
      for (const sp of Object.values(Species)) {
        const n = rows.find((r) => r.status === status && r.species === sp)?._count._all ?? 0;
        row[sp] = n;
        total += n;
      }
      row.total = total;
      return row;
    });
    return {
      columns: [
        { key: 'status', label: 'Estado' },
        ...Object.values(Species).map((s) => ({
          key: s,
          label: SPECIES_LABELS[s],
          type: 'number' as const,
        })),
        { key: 'total', label: 'Total', type: 'number' as const },
      ],
      rows: data,
      chart: {
        kind: 'bar' as const,
        xKey: 'status',
        stacked: true,
        series: Object.values(Species).map((s) => ({
          key: s,
          label: SPECIES_LABELS[s],
        })),
      },
    };
  }

  private async entriesByMonth(r: Range, f: ReportFiltersDto) {
    const rows = await this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char(a.entry_date AT TIME ZONE 'America/La_Paz', 'YYYY-MM') AS month, count(*) AS count
        FROM animals a
       WHERE a.deleted_at IS NULL AND a.entry_date BETWEEN ${r.fromTs} AND ${r.toTs} ${speciesSql(f.species)}
       GROUP BY 1`;
    const map = new Map(rows.map((x) => [x.month, Number(x.count)]));
    return {
      columns: [
        { key: 'month', label: 'Mes' },
        { key: 'entries', label: 'Ingresos', type: 'number' as const },
      ],
      rows: monthsBetween(r.from, r.to).map((m) => ({
        month: m,
        entries: map.get(m) ?? 0,
      })),
      chart: {
        kind: 'line' as const,
        xKey: 'month',
        series: [{ key: 'entries', label: 'Ingresos' }],
      },
    };
  }

  private async vaccinationsByPeriod(r: Range, f: ReportFiltersDto) {
    const rows = await this.prisma.$queryRaw<{ month: string; vaccine: string; count: bigint }[]>`
      SELECT to_char(v.application_date, 'YYYY-MM') AS month, vc.name AS vaccine, count(*) AS count
        FROM vaccinations v
        JOIN animals a ON a.id = v.animal_id
        JOIN vaccines vc ON vc.id = v.vaccine_id
       WHERE v.application_date BETWEEN ${r.from}::date AND ${r.to}::date ${speciesSql(f.species)}
       GROUP BY 1, 2
       ORDER BY 1, 2`;
    const vaccines = [...new Set(rows.map((x) => x.vaccine))].sort();
    const data = monthsBetween(r.from, r.to).map((month) => {
      const row: Record<string, Cell> = { month };
      let total = 0;
      vaccines.forEach((name, i) => {
        const n = Number(rows.find((x) => x.month === month && x.vaccine === name)?.count ?? 0);
        row[`v${i}`] = n;
        total += n;
      });
      row.total = total;
      return row;
    });
    return {
      columns: [
        { key: 'month', label: 'Mes' },
        ...vaccines.map((name, i) => ({
          key: `v${i}`,
          label: name,
          type: 'number' as const,
        })),
        { key: 'total', label: 'Total', type: 'number' as const },
      ],
      rows: data,
      chart: {
        kind: 'bar' as const,
        xKey: 'month',
        stacked: true,
        series: vaccines.map((name, i) => ({ key: `v${i}`, label: name })),
      },
    };
  }

  private async upcomingVaccines(f: ReportFiltersDto) {
    const today = todayLaPaz();
    const rows = (await this.clinical.upcomingVaccinations(30)).filter(
      (v) => !f.species || v.species === f.species,
    );
    return {
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Animal' },
        { key: 'species', label: 'Especie' },
        { key: 'vaccine', label: 'Vacuna' },
        { key: 'applied', label: 'Última aplicación', type: 'date' as const },
        { key: 'next', label: 'Próxima dosis', type: 'date' as const },
        { key: 'days', label: 'Días restantes', type: 'number' as const },
      ],
      rows: rows.map((v) => {
        const next = dateOnly(v.next_dose_date) as string;
        return {
          code: v.animal_code,
          name: v.animal_name ?? '—',
          species: SPECIES_LABELS[v.species as Species],
          vaccine: v.vaccine_name,
          applied: dateOnly(v.application_date),
          next,
          days: diffDays(today, next),
        };
      }),
    };
  }

  private async activeTreatments(f: ReportFiltersDto) {
    const rows = await this.prisma.treatment.findMany({
      where: {
        status: 'ACTIVO',
        consultation: {
          animal: {
            deletedAt: null,
            ...(f.species ? { species: f.species } : {}),
          },
        },
      },
      orderBy: { startDate: 'asc' },
      include: {
        consultation: {
          select: {
            animal: { select: { code: true, name: true, species: true } },
            veterinarian: { select: { fullName: true } },
          },
        },
        _count: { select: { medications: true } },
      },
    });
    return {
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Animal' },
        { key: 'species', label: 'Especie' },
        { key: 'description', label: 'Tratamiento' },
        { key: 'start', label: 'Inicio', type: 'date' as const },
        { key: 'end', label: 'Fin previsto', type: 'date' as const },
        { key: 'medications', label: 'Medicamentos', type: 'number' as const },
        { key: 'vet', label: 'Veterinario' },
      ],
      rows: rows.map((t) => ({
        code: t.consultation.animal.code,
        name: t.consultation.animal.name ?? '—',
        species: SPECIES_LABELS[t.consultation.animal.species],
        description: t.description,
        start: dateOnly(t.startDate),
        end: dateOnly(t.endDate),
        medications: t._count.medications,
        vet: t.consultation.veterinarian.fullName,
      })),
    };
  }

  private async inQuarantine(f: ReportFiltersDto) {
    const today = todayLaPaz();
    const rows = await this.prisma.quarantinePeriod.findMany({
      where: {
        status: 'ACTIVO',
        animal: {
          deletedAt: null,
          ...(f.species ? { species: f.species } : {}),
        },
      },
      orderBy: { startDate: 'asc' },
      include: {
        animal: { select: { code: true, name: true, species: true } },
        _count: { select: { controls: true } },
      },
    });
    return {
      columns: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Animal' },
        { key: 'species', label: 'Especie' },
        { key: 'type', label: 'Tipo' },
        { key: 'start', label: 'Inicio', type: 'date' as const },
        { key: 'expected', label: 'Fin estimado', type: 'date' as const },
        { key: 'days', label: 'Días en el periodo', type: 'number' as const },
        { key: 'controls', label: 'Controles', type: 'number' as const },
        { key: 'overdue', label: '¿Vencido?' },
      ],
      rows: rows.map((p) => {
        const start = laPazDate(p.startDate) as string;
        const expected = laPazDate(p.expectedEndDate);
        return {
          code: p.animal.code,
          name: p.animal.name ?? '—',
          species: SPECIES_LABELS[p.animal.species],
          type: p.type === 'CUARENTENA' ? 'Cuarentena' : 'Observación',
          start,
          expected,
          days: diffDays(start, today),
          controls: p._count.controls,
          overdue: expected && expected < today ? 'Sí' : 'No',
        };
      }),
    };
  }

  private async adoptionsByMonth(r: Range, f: ReportFiltersDto) {
    const rows = await this.prisma.$queryRaw<{ month: string; status: string; count: bigint }[]>`
      SELECT to_char(ar.decision_date AT TIME ZONE 'America/La_Paz', 'YYYY-MM') AS month,
             ar.status::text AS status, count(*) AS count
        FROM adoption_requests ar
        JOIN animals a ON a.id = ar.animal_id
       WHERE ar.status::text IN ('APROBADA', 'RECHAZADA', 'CANCELADA')
         AND ar.decision_date BETWEEN ${r.fromTs} AND ${r.toTs} ${speciesSql(f.species)}
       GROUP BY 1, 2`;
    const get = (m: string, s: string) =>
      Number(rows.find((x) => x.month === m && x.status === s)?.count ?? 0);
    const statuses = ['APROBADA', 'RECHAZADA', 'CANCELADA'] as const;
    return {
      columns: [
        { key: 'month', label: 'Mes' },
        ...statuses.map((s) => ({
          key: s,
          label: `${REQUEST_STATUS_LABELS[s]}s`,
          type: 'number' as const,
        })),
        { key: 'total', label: 'Total', type: 'number' as const },
      ],
      rows: monthsBetween(r.from, r.to).map((month) => {
        const row: Record<string, Cell> = { month };
        let total = 0;
        for (const s of statuses) {
          row[s] = get(month, s);
          total += row[s];
        }
        row.total = total;
        return row;
      }),
      chart: {
        kind: 'bar' as const,
        xKey: 'month',
        series: statuses.map((s) => ({
          key: s,
          label: `${REQUEST_STATUS_LABELS[s]}s`,
        })),
      },
    };
  }

  private async averageAdoptionTime(r: Range, f: ReportFiltersDto) {
    const rows = await this.prisma.$queryRaw<
      {
        species: string;
        count: bigint;
        avg: number | null;
        min: number | null;
        max: number | null;
      }[]
    >`
      SELECT a.species::text AS species, count(*) AS count,
             avg(EXTRACT(EPOCH FROM (COALESCE(ar.delivery_date, ar.decision_date) - a.entry_date)) / 86400)::float8 AS avg,
             min(EXTRACT(EPOCH FROM (COALESCE(ar.delivery_date, ar.decision_date) - a.entry_date)) / 86400)::float8 AS min,
             max(EXTRACT(EPOCH FROM (COALESCE(ar.delivery_date, ar.decision_date) - a.entry_date)) / 86400)::float8 AS max
        FROM adoption_requests ar
        JOIN animals a ON a.id = ar.animal_id
       WHERE ar.status = 'APROBADA'
         AND ar.decision_date BETWEEN ${r.fromTs} AND ${r.toTs} ${speciesSql(f.species)}
       GROUP BY 1
       ORDER BY 1`;
    const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
    const data = rows.map((x) => ({
      species: SPECIES_LABELS[x.species as Species],
      count: Number(x.count),
      avg: round1(x.avg),
      min: round1(x.min),
      max: round1(x.max),
    }));
    if (data.length > 1) {
      const total = data.reduce((s, x) => s + x.count, 0);
      const weighted = data.reduce((s, x) => s + (x.avg ?? 0) * x.count, 0) / total;
      data.push({
        species: 'Todas',
        count: total,
        avg: round1(weighted),
        min: Math.min(...data.map((x) => x.min ?? Infinity)),
        max: Math.max(...data.map((x) => x.max ?? -Infinity)),
      });
    }
    return {
      columns: [
        { key: 'species', label: 'Especie' },
        { key: 'count', label: 'Adopciones', type: 'number' as const },
        { key: 'avg', label: 'Promedio (días)', type: 'number' as const },
        { key: 'min', label: 'Mínimo (días)', type: 'number' as const },
        { key: 'max', label: 'Máximo (días)', type: 'number' as const },
      ],
      rows: data,
      chart: {
        kind: 'bar' as const,
        xKey: 'species',
        series: [{ key: 'avg', label: 'Promedio (días)' }],
      },
    };
  }
}
