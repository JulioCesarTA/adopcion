import { Injectable, Logger } from '@nestjs/common';
import { AnimalStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonthLaPaz, startOfMonthLaPazMinus, todayLaPaz } from '../../common/dates';
import { OUTSIDE_STATES } from '../animals/animal-status';
import { AlertsService } from './alerts.service';

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** Últimos `n` meses (incluido el actual) en hora de Bolivia, como 'YYYY-MM'. */
export function lastMonths(n: number, now = new Date()): string[] {
  const [y, m] = todayLaPaz(now).slice(0, 7).split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_ES[m - 1]} ${String(y).slice(2)}`;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  /** CU18: si un indicador falla, se devuelve su error sin romper el resto. */
  private async section<T>(name: string, fn: () => Promise<T>): Promise<Section<T>> {
    try {
      return { ok: true, data: await fn() };
    } catch (err) {
      this.logger.error(`Indicador "${name}" falló: ${String(err)}`);
      return { ok: false, error: 'No se pudo calcular este indicador' };
    }
  }

  async dashboard(role: UserRole) {
    const seesRequests = role !== 'VETERINARIO';
    const [cards, byStatus, entriesVsAdoptions, alerts, latestRequests] = await Promise.all([
      this.section('cards', () => this.cards()),
      this.section('byStatus', () => this.byStatus()),
      this.section('entriesVsAdoptions', () => this.entriesVsAdoptions()),
      this.section('alerts', () => this.alertsService.alerts()),
      seesRequests
        ? this.section('latestRequests', () => this.latestRequests())
        : Promise.resolve(null),
    ]);
    return { cards, byStatus, entriesVsAdoptions, alerts, latestRequests };
  }

  private async cards() {
    const notDeleted = { deletedAt: null };
    const [inInstitution, inQuarantine, available, activeRequests, adoptionsThisMonth] =
      await Promise.all([
        this.prisma.animal.count({
          where: { ...notDeleted, status: { notIn: OUTSIDE_STATES } },
        }),
        this.prisma.animal.count({
          where: {
            ...notDeleted,
            status: { in: ['EN_CUARENTENA', 'EN_OBSERVACION'] },
          },
        }),
        this.prisma.animal.count({
          where: { ...notDeleted, status: 'DISPONIBLE_ADOPCION' },
        }),
        this.prisma.adoptionRequest.count({
          where: { status: { in: ['PENDIENTE', 'EN_EVALUACION'] } },
        }),
        this.prisma.adoptionRequest.count({
          where: {
            status: 'APROBADA',
            decisionDate: { gte: startOfMonthLaPaz() },
          },
        }),
      ]);
    return {
      inInstitution,
      inQuarantine,
      available,
      activeRequests,
      adoptionsThisMonth,
    };
  }

  private async byStatus() {
    const rows = await this.prisma.animal.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const counts = new Map(rows.map((r) => [r.status, r._count._all]));
    return Object.values(AnimalStatus).map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    }));
  }

  private async entriesVsAdoptions() {
    const months = lastMonths(6);
    const since = startOfMonthLaPazMinus(5);
    const [entries, adoptions] = await Promise.all([
      this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT to_char(entry_date AT TIME ZONE 'America/La_Paz', 'YYYY-MM') AS month, count(*) AS count
          FROM animals
         WHERE deleted_at IS NULL AND entry_date >= ${since}
         GROUP BY 1`,
      this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT to_char(decision_date AT TIME ZONE 'America/La_Paz', 'YYYY-MM') AS month, count(*) AS count
          FROM adoption_requests
         WHERE status = 'APROBADA' AND decision_date >= ${since}
         GROUP BY 1`,
    ]);
    const e = new Map(entries.map((r) => [r.month, Number(r.count)]));
    const a = new Map(adoptions.map((r) => [r.month, Number(r.count)]));
    return months.map((m) => ({
      month: m,
      label: monthLabel(m),
      entries: e.get(m) ?? 0,
      adoptions: a.get(m) ?? 0,
    }));
  }

  private latestRequests() {
    return this.prisma.adoptionRequest.findMany({
      orderBy: { requestDate: 'desc' },
      take: 5,
      include: {
        animal: { select: { id: true, code: true, name: true } },
        adopterProfile: {
          include: { person: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }
}
