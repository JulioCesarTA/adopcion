import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonthLaPazMinus } from '../../common/dates';

/**
 * Seis indicadores de gestión del albergue. Están elegidos para que cada uno
 * responda una pregunta distinta y accionable, no para repetir el panel:
 *
 *   1. ¿Logramos dar salida a los animales que ingresan?      → tasa de adopción
 *   2. ¿Cuánto tarda un animal en encontrar hogar?            → permanencia media
 *   3. ¿Las adopciones duran?                                 → tasa de devolución
 *   4. ¿Qué tan selectivo es el proceso?                      → tasa de aprobación
 *   5. ¿Cuánto hacemos esperar al adoptante?                  → tiempo de evaluación
 *   6. ¿Está sana la población que tenemos?                   → cobertura de vacunación
 *
 * Cada indicador compara el periodo actual contra el anterior de la misma
 * duración, para que el número tenga contexto y no sea un dato suelto.
 */

export type Trend = 'sube' | 'baja' | 'estable';
/** Si subir es bueno (adopciones) o malo (devoluciones). */
export type Direction = 'mas-es-mejor' | 'menos-es-mejor';

export interface Kpi {
  key: string;
  label: string;
  /** Valor del periodo actual. `null` cuando no hay datos suficientes. */
  value: number | null;
  unit: '%' | 'días' | 'animales' | 'solicitudes';
  previous: number | null;
  /** Diferencia absoluta contra el periodo anterior. */
  delta: number | null;
  trend: Trend;
  direction: Direction;
  /** Numerador y denominador, para que el número sea auditable. */
  detail: string;
  help: string;
}

/** Un mes del periodo, para los gráficos de evolución. */
export interface KpiMonth {
  /** AAAA-MM en hora de Bolivia. */
  month: string;
  approved: number;
  rejected: number;
  /** Aprobadas sobre resueltas en el mes (null si no hubo resoluciones). */
  adoptionRate: number | null;
  avgEvaluationDays: number | null;
  avgStayDays: number | null;
}

export interface KpisResult {
  periodMonths: number;
  from: string;
  to: string;
  kpis: Kpi[];
  monthly: KpiMonth[];
  generatedAt: Date;
}

/** AAAA-MM de una fecha en la zona de Bolivia (UTC-4, sin horario de verano). */
const monthKey = (d: Date) => new Date(d.getTime() - 4 * 3_600_000).toISOString().slice(0, 7);
const mean = (xs: number[]) => (xs.length ? r2(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class KpisService {
  private readonly logger = new Logger(KpisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async kpis(periodMonths = 6): Promise<KpisResult> {
    // Dos ventanas contiguas de la misma duración: actual y anterior.
    const start = startOfMonthLaPazMinus(periodMonths - 1);
    const previousStart = startOfMonthLaPazMinus(periodMonths * 2 - 1);
    const now = new Date();

    const [adoption, stay, returns, approval, evaluation, vaccination, monthly] = await Promise.all(
      [
        this.adoptionRate(start, previousStart),
        this.averageStay(start, previousStart),
        this.returnRate(start, previousStart),
        this.approvalRate(start, previousStart),
        this.evaluationTime(start, previousStart),
        this.vaccinationCoverage(),
        this.monthly(start, periodMonths),
      ],
    );

    return {
      periodMonths,
      from: start.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
      kpis: [adoption, stay, returns, approval, evaluation, vaccination],
      monthly,
      generatedAt: now,
    };
  }

  /** Evolución mes a mes de las solicitudes resueltas (mismas reglas que los indicadores). */
  private async monthly(start: Date, periodMonths: number): Promise<KpiMonth[]> {
    const rows = await this.prisma.adoptionRequest.findMany({
      where: { status: { in: ['APROBADA', 'RECHAZADA'] }, decisionDate: { gte: start } },
      select: {
        status: true,
        requestDate: true,
        decisionDate: true,
        deliveryDate: true,
        animal: { select: { entryDate: true } },
      },
    });

    const first = monthKey(new Date(start.getTime() + 5 * 86_400_000));
    const [y0, m0] = first.split('-').map(Number);
    const months = Array.from({ length: periodMonths }, (_, i) => {
      const d = new Date(Date.UTC(y0, m0 - 1 + i, 1));
      return d.toISOString().slice(0, 7);
    });

    return months.map((month) => {
      const inMonth = rows.filter((r) => r.decisionDate && monthKey(r.decisionDate) === month);
      const approved = inMonth.filter((r) => r.status === 'APROBADA');
      const rejected = inMonth.length - approved.length;
      const evalDays = inMonth
        .map((r) => (r.decisionDate!.getTime() - r.requestDate.getTime()) / 86_400_000)
        .filter((d) => d >= 0);
      const stayDays = approved
        .map((r) => {
          const end = r.deliveryDate ?? r.decisionDate;
          return end && r.animal?.entryDate
            ? (end.getTime() - r.animal.entryDate.getTime()) / 86_400_000
            : -1;
        })
        .filter((d) => d >= 0);
      return {
        month,
        approved: approved.length,
        rejected,
        adoptionRate: inMonth.length ? r2((approved.length / inMonth.length) * 100) : null,
        avgEvaluationDays: mean(evalDays),
        avgStayDays: mean(stayDays),
      };
    });
  }

  /** Arma el indicador calculando tendencia y diferencia. */
  private build(
    base: Omit<Kpi, 'delta' | 'trend'>,
    { threshold = 0.5 }: { threshold?: number } = {},
  ): Kpi {
    const { value, previous } = base;
    if (value === null || previous === null) {
      return { ...base, delta: null, trend: 'estable' };
    }
    const delta = r2(value - previous);
    const trend: Trend = Math.abs(delta) < threshold ? 'estable' : delta > 0 ? 'sube' : 'baja';
    return { ...base, delta, trend };
  }

  // ------------------------------------------------------------------- 1
  /** Adopciones aprobadas sobre el total de animales que salieron de la institución. */
  private async adoptionRate(start: Date, previousStart: Date): Promise<Kpi> {
    const rate = async (from: Date, to: Date | undefined) => {
      const where = { decisionDate: { gte: from, ...(to ? { lt: to } : {}) } };
      const [approved, resolved] = await Promise.all([
        this.prisma.adoptionRequest.count({ where: { ...where, status: 'APROBADA' } }),
        this.prisma.adoptionRequest.count({
          where: { ...where, status: { in: ['APROBADA', 'RECHAZADA'] } },
        }),
      ]);
      return { approved, resolved };
    };

    const current = await rate(start, undefined);
    const previous = await rate(previousStart, start);

    return this.build({
      key: 'tasa-adopcion',
      label: 'Adopciones concretadas',
      value: current.resolved ? r2((current.approved / current.resolved) * 100) : null,
      unit: '%',
      previous: previous.resolved ? r2((previous.approved / previous.resolved) * 100) : null,
      direction: 'mas-es-mejor',
      detail: `${current.approved} aprobadas de ${current.resolved} solicitudes resueltas`,
      help: 'Qué proporción de las solicitudes resueltas terminó en una adopción efectiva.',
    });
  }

  // ------------------------------------------------------------------- 2
  /** Días promedio entre el ingreso del animal y la entrega al adoptante. */
  private async averageStay(start: Date, previousStart: Date): Promise<Kpi> {
    const avg = async (from: Date, to: Date | undefined) => {
      const rows = await this.prisma.adoptionRequest.findMany({
        where: {
          status: 'APROBADA',
          decisionDate: { gte: from, ...(to ? { lt: to } : {}) },
        },
        select: { decisionDate: true, deliveryDate: true, animal: { select: { entryDate: true } } },
      });
      const days = rows
        .map((r) => {
          const end = r.deliveryDate ?? r.decisionDate;
          if (!end || !r.animal?.entryDate) return null;
          return (end.getTime() - r.animal.entryDate.getTime()) / 86_400_000;
        })
        .filter((d): d is number => d !== null && d >= 0);
      return days.length ? days.reduce((a, b) => a + b, 0) / days.length : null;
    };

    const current = await avg(start, undefined);
    const previous = await avg(previousStart, start);

    return this.build(
      {
        key: 'permanencia-media',
        label: 'Permanencia hasta la adopción',
        value: current === null ? null : r2(current),
        unit: 'días',
        previous: previous === null ? null : r2(previous),
        direction: 'menos-es-mejor',
        detail: 'Desde el ingreso del animal hasta la fecha de entrega',
        help: 'Cuánto tarda en promedio un animal en encontrar hogar. Bajar este número libera cupos.',
      },
      { threshold: 1 },
    );
  }

  // ------------------------------------------------------------------- 3
  /** Animales que volvieron a la institución después de haber sido adoptados. */
  private async returnRate(start: Date, previousStart: Date): Promise<Kpi> {
    const rate = async (from: Date, to: Date | undefined) => {
      const range = { gte: from, ...(to ? { lt: to } : {}) };
      const [returned, adopted] = await Promise.all([
        this.prisma.animal.count({
          where: { deletedAt: null, status: 'DEVUELTO', exitDate: range },
        }),
        this.prisma.adoptionRequest.count({
          where: { status: 'APROBADA', decisionDate: range },
        }),
      ]);
      return { returned, adopted };
    };

    const current = await rate(start, undefined);
    const previous = await rate(previousStart, start);

    return this.build({
      key: 'tasa-devolucion',
      label: 'Animales devueltos',
      value: current.adopted ? r2((current.returned / current.adopted) * 100) : null,
      unit: '%',
      previous: previous.adopted ? r2((previous.returned / previous.adopted) * 100) : null,
      direction: 'menos-es-mejor',
      detail: `${current.returned} devoluciones frente a ${current.adopted} adopciones`,
      help: 'Mide si las adopciones se sostienen. Un valor alto sugiere revisar la evaluación previa.',
    });
  }

  // ------------------------------------------------------------------- 4
  /** Qué tan selectivo es el proceso: aprobadas sobre el total evaluado. */
  private async approvalRate(start: Date, previousStart: Date): Promise<Kpi> {
    const rate = async (from: Date, to: Date | undefined) => {
      const range = { gte: from, ...(to ? { lt: to } : {}) };
      const [approved, total] = await Promise.all([
        this.prisma.adoptionRequest.count({
          where: { status: 'APROBADA', decisionDate: range },
        }),
        this.prisma.adoptionRequest.count({
          where: { status: { in: ['APROBADA', 'RECHAZADA'] }, decisionDate: range },
        }),
      ]);
      return { approved, total };
    };

    const current = await rate(start, undefined);
    const previous = await rate(previousStart, start);

    return this.build({
      key: 'solicitudes-recibidas',
      label: 'Solicitudes recibidas',
      value: current.total || null,
      unit: 'solicitudes',
      previous: previous.total || null,
      direction: 'mas-es-mejor',
      detail: `${current.total} solicitudes evaluadas en el periodo`,
      help: 'Volumen de demanda de adopción. Indica el alcance de la difusión del albergue.',
    });
  }

  // ------------------------------------------------------------------- 5
  /** Días entre que se registra la solicitud y se toma la decisión. */
  private async evaluationTime(start: Date, previousStart: Date): Promise<Kpi> {
    const avg = async (from: Date, to: Date | undefined) => {
      const rows = await this.prisma.adoptionRequest.findMany({
        where: {
          status: { in: ['APROBADA', 'RECHAZADA'] },
          decisionDate: { gte: from, ...(to ? { lt: to } : {}) },
        },
        select: { requestDate: true, decisionDate: true },
      });
      const days = rows
        .map((r) =>
          r.decisionDate ? (r.decisionDate.getTime() - r.requestDate.getTime()) / 86_400_000 : null,
        )
        .filter((d): d is number => d !== null && d >= 0);
      return days.length ? days.reduce((a, b) => a + b, 0) / days.length : null;
    };

    const current = await avg(start, undefined);
    const previous = await avg(previousStart, start);

    return this.build(
      {
        key: 'tiempo-evaluacion',
        label: 'Tiempo de evaluación',
        value: current === null ? null : r2(current),
        unit: 'días',
        previous: previous === null ? null : r2(previous),
        direction: 'menos-es-mejor',
        detail: 'Desde que se registra la solicitud hasta la decisión',
        help: 'Cuánto espera un adoptante por una respuesta. Demoras largas hacen perder adoptantes.',
      },
      { threshold: 0.5 },
    );
  }

  // ------------------------------------------------------------------- 6
  /** Animales presentes con al menos una vacuna aplicada y sin dosis vencida. */
  private async vaccinationCoverage(): Promise<Kpi> {
    const present = await this.prisma.animal.findMany({
      where: { deletedAt: null, status: { notIn: ['ADOPTADO', 'FALLECIDO', 'DEVUELTO'] } },
      select: {
        id: true,
        vaccinations: {
          orderBy: { applicationDate: 'desc' },
          select: { nextDoseDate: true },
        },
      },
    });

    const today = new Date();
    const covered = present.filter((a) => {
      if (a.vaccinations.length === 0) return false;
      // Vigente si ninguna próxima dosis está vencida.
      return !a.vaccinations.some((v) => v.nextDoseDate && v.nextDoseDate < today);
    }).length;

    return this.build({
      key: 'cobertura-vacunacion',
      label: 'Cobertura de vacunación',
      value: present.length ? r2((covered / present.length) * 100) : null,
      unit: '%',
      previous: null, // es una foto del momento, no admite comparación con el pasado
      direction: 'mas-es-mejor',
      detail: `${covered} de ${present.length} animales en la institución, con esquema al día`,
      help: 'Proporción de animales presentes con vacunación registrada y sin dosis vencida.',
    });
  }
}
