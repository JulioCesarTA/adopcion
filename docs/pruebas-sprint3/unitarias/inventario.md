# Inventario de pruebas unitarias — Sprint 3

## Pruebas que ya existían y tocan el Sprint 3

| Archivo | Qué prueba | HU | ¿Se reutilizó? |
|---|---|---|---|
| `backend/src/common/guards/roles.guard.spec.ts` | Acceso por rol, incluido el rol `CLIENTE` (4 pruebas) | HU7, HU9 | No |
| `backend/test/public.e2e-spec.ts` | Portal público y registro de clientes, con base de datos (no es unitaria) | HU9 | No |
| `backend/test/business-rules.e2e-spec.ts` | Reglas de negocio con base de datos (no es unitaria) | HU12 | No |

No existían pruebas unitarias del panel, de los indicadores de gestión, del asistente ni de los
seguimientos. No se modificó ni se copió ninguna prueba existente: las 18 pruebas unitarias del
Sprint 3 son nuevas («nueva»: true).

## Pruebas nuevas de este punto

| Archivo | Unidades probadas | Pruebas | HU |
|---|---|---|---|
| `backend/src/modules/dashboard/hu7.sprint3.unit.spec.ts` | `lastMonths`, `monthLabel`, `KpisService.kpis`, `DashboardService.dashboard`, `RolesGuard` (indicadores) | 6 | HU7 |
| `backend/src/modules/chat/hu9.sprint3.unit.spec.ts` | `ChatDto`, `ThrottlerGuard` (15 consultas por minuto), `adoptablesPrompt`, `stableSystemPrompt`, ruta pública | 6 | HU9 |
| `backend/src/modules/adoptions/hu12.sprint3.unit.spec.ts` | `CreateFollowupDto`, `AdoptionsService.createFollowup`, `AdoptionsService.listFollowups`, `AnimalsService.findOne`, `RolesGuard` (seguimientos) | 6 | HU12 |

## Métodos que no se repitieron

Los caminos de la caja blanca del Sprint 3 (`section`, `dashboard`, `build`, `validate`, `reply`,
`createFollowup` y `listFollowups`) no se repiten en las pruebas unitarias: estas comprueban otras
propiedades (filtros, orden, autor, límites y permisos) u otras unidades.
