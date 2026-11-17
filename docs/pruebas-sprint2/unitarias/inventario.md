# Inventario de pruebas unitarias — Sprint 2

## Pruebas que ya existían y tocan el Sprint 2

| Archivo | Unidad probada | HU | ¿Se reutilizó? |
|---|---|---|---|
| `backend/src/modules/recommendation/engine.spec.ts` | Motor de compatibilidad: criterios, filtros obligatorios, pesos, redondeo y orden del ranking (22 pruebas) | HU6 | No |
| `backend/src/modules/recommendation/ml/ml.spec.ts` | Random Forest, árbol CART, Gini, semilla y métricas (46 pruebas) | HU6 | No |
| `backend/src/modules/animals/animal-status.spec.ts` | Máquinas de estado del animal y de la solicitud (20 pruebas) | HU10, HU11 | No |
| `backend/test/business-rules.e2e-spec.ts` | Reglas de negocio RN-03 a RN-08 con base de datos (no es unitaria) | HU5, HU6, HU10, HU11 | No |

No se modificó ninguna de estas pruebas y ninguna se copió: las 24 pruebas unitarias del Sprint 2
son nuevas («nueva»: true). Algunas cubren unidades que también aparecen en `engine.spec.ts`,
`ml.spec.ts` o `animal-status.spec.ts` (por ejemplo, `sortRanking` o las transiciones de la
solicitud), pero con datos y casos propios del Sprint 2.

## Pruebas nuevas de este punto

| Archivo | Unidades probadas | Pruebas | HU |
|---|---|---|---|
| `backend/src/modules/adopters/hu5.sprint2.unit.spec.ts` | `CreateAdopterDto`, `maskCi`, `canSeeFullCi`, `AdoptersService.findOne`, `AdoptersService.create` | 6 | HU5 |
| `backend/src/modules/recommendation/hu6.sprint2.unit.spec.ts` | `computeCompatibility`, `sortRanking`, `RandomForest`, `RolesGuard` (entrenamiento), `RecommendationService.rankingForAnimal` | 6 | HU6 |
| `backend/src/modules/clinical/hu10.sprint2.unit.spec.ts` | `CreatePeriodDto`, `CreateControlDto`, `clinicalStatusFor`, `ClinicalService.startPeriod`, `ClinicalService.addControl` | 6 | HU10 |
| `backend/src/modules/adoptions/hu11.sprint2.unit.spec.ts` | `canRequestTransition`, `animalStatusAfter`, `DecisionDto`, `appendNote`, `AdoptionsService.addNote`, `AdoptionsService.changeStatus` | 6 | HU11 |

## Métodos que no se repitieron

Los métodos de la caja blanca del Sprint 2 (`assertCiFree`, `AdoptionsService.create`, `score`,
`levelFor`, `closePeriod`, `enableAdoption`, `decide` y `act`) no tienen pruebas unitarias que
repitan sus caminos.
