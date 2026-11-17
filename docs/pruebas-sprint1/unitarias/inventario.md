# Inventario de pruebas unitarias del backend

Conteo tomado de una ejecución real de `npx jest` en `backend/` (sin contar las pruebas e2e de
`backend/test/`, que usan base de datos). Fecha: 2026-11-17.

## Pruebas que ya existían

| Archivo | Unidad probada | Pruebas | HU | ¿Se reutilizó? |
|---|---|---|---|---|
| `backend/src/common/guards/roles.guard.spec.ts` | `RolesGuard` (acceso por rol) | 4 | Transversal (HU8) | No |
| `backend/src/modules/animals/animal-status.spec.ts` | Máquina de estados del animal y de la solicitud (`canTransition`, `clinicalStatusFor`, etc.) | 20 | HU1 (estados) y Sprint 2 (adopciones) | No |
| `backend/src/modules/auth/auth.service.spec.ts` | `AuthService` (login, refresh, cambio de contraseña) | 8 | HU8 | No |
| `backend/src/modules/recommendation/engine.spec.ts` | Motor de compatibilidad | 22 | Sprint 3 | No |
| `backend/src/modules/recommendation/ml/ml.spec.ts` | Random Forest, Gini, métricas | 46 | Sprint 3 | No |
| `backend/src/modules/animals/animals.sprint1.spec.ts` | Caja blanca `CB-HU1-*` | 12 | HU1 | No (caminos básicos) |
| `backend/src/modules/clinical/clinical.sprint1.spec.ts` | Caja blanca `CB-HU2-*`, `CB-HU3-*`, `CB-HU4-*` | 17 | HU2, HU3, HU4 | No (caminos básicos) |
| `backend/src/modules/auth/auth.sprint1.spec.ts` | Caja blanca `CB-HU8-A-*` | 7 | HU8 | No (caminos básicos) |
| `backend/src/modules/users/users.sprint1.spec.ts` | Caja blanca `CB-HU8-B-*`, `CB-HU8-C-*` | 7 | HU8 | No (caminos básicos) |

Ninguna prueba existente se reutilizó. Las de caja blanca ya se usaron en el documento, y la guía
pide no repetir esos caminos. Las de `auth.service.spec.ts` se superponen con los caminos de
`AuthService.login` ya analizados.

## Pruebas nuevas de este punto

| Archivo | Unidades probadas | Pruebas | HU |
|---|---|---|---|
| `backend/src/modules/animals/animals.hu1.unit.spec.ts` | `detectImageType`, `AnimalsService.savePhoto`, `CreateAnimalDto`, `AnimalsService.create`, `ListAnimalsQueryDto` | 6 | HU1 |
| `backend/src/modules/clinical/consultas.hu2.unit.spec.ts` | `CreateConsultationDto`, `CreateMedicationDto`, `ClinicalService.createConsultation`, `RolesGuard` | 6 | HU2 |
| `backend/src/modules/clinical/historial.hu3.unit.spec.ts` | `AnimalsService.timeline`, `ClinicalService.updateTreatment`, `ClinicalService.updateVaccination`, `RolesGuard` | 6 | HU3 |
| `backend/src/modules/clinical/vacunas.hu4.unit.spec.ts` | `toDateOnly`, `addDays`, `todayLaPaz`, `ClinicalService.upcomingVaccinations`, `ClinicalService.createVaccination` | 6 | HU4 |
| `backend/src/modules/users/usuarios.hu8.unit.spec.ts` | `CreateUserDto`, `toPublicUser`, `UsersService.resetPassword`, `UsersService.update`, `AuthService.changePassword`, `AuthService.refresh` | 6 | HU8 |

## Cómo repetir todo

```bash
cd backend
npx jest unit.spec -t "PU-HU" --json --outputFile=../docs/pruebas-sprint1/unitarias/jest-resultado.json
# cobertura: comando completo en unitarias.json → comandos.cobertura
for h in 1 2 3 4 8; do FORCE_COLOR=1 npx jest "hu$h.unit.spec" -t "PU-HU$h" --verbose > ../docs/pruebas-sprint1/unitarias/salidas/PU-HU$h.txt 2>&1; done
FORCE_COLOR=1 npx jest unit.spec -t "PU-HU" > ../docs/pruebas-sprint1/unitarias/salidas/PU-resumen.txt 2>&1
cd ..
node docs/pruebas-sprint1/unitarias/capturar.js
node docs/pruebas-sprint1/unitarias/generar-unitarias.js
node docs/pruebas-sprint1/unitarias/validar-unitarias.js
```
