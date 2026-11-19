/**
 * Prueba de caja blanca — camino básico de AdoptionsService.addNote (HU11 Gestionar Proceso de Adopción).
 * C(G) = 3: un caso de prueba por cada camino básico independiente.
 * Sin base de datos ni red: Prisma y AnimalStatusService están simulados con jest.fn().
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AnimalStatusService } from '../animals/animal-status.service';
import type { AuthUser } from '../../common/types';
import { AdoptionsService } from './adoptions.service';

const SOLICITUD = '44444444-4444-4444-4444-444444444444';
const user = { id: 'a1', role: 'ADMIN', fullName: 'Admin de Prueba' } as AuthUser;

function setup(solicitud: object | null) {
  const update = jest.fn(({ data }: { data: object }) => ({ id: SOLICITUD, ...solicitud, ...data }));
  const tx = { adoptionRequest: { findUnique: jest.fn().mockResolvedValue(solicitud), update } };
  const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
  const service = new AdoptionsService(
    prisma as unknown as PrismaService,
    {} as unknown as AnimalStatusService,
  );
  return { service, update };
}

describe('HU11 caja blanca — camino básico de addNote', () => {
  it('C1 (1-2-3-4-8-9) la solicitud no existe: lanza NotFoundException', async () => {
    const { service, update } = setup(null);
    await expect(service.addNote(SOLICITUD, 'Visita al domicilio', user)).rejects.toThrow(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('C2 (1-2-3-5-6-8-9) la solicitud ya está Aprobada: lanza ConflictException', async () => {
    const { service, update } = setup({ id: SOLICITUD, status: 'APROBADA', evaluationNotes: null });
    await expect(service.addNote(SOLICITUD, 'Visita al domicilio', user)).rejects.toThrow(
      ConflictException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('C3 (1-2-3-5-7-8-9) la solicitud está En evaluación: guarda la nota', async () => {
    const { service, update } = setup({
      id: SOLICITUD,
      status: 'EN_EVALUACION',
      evaluationNotes: null,
    });
    const res = await service.addNote(SOLICITUD, 'Visita al domicilio', user);
    expect(update).toHaveBeenCalledTimes(1);
    expect(res.status).toBe('EN_EVALUACION');
    expect(res.evaluationNotes).toContain('Visita al domicilio');
  });
});
