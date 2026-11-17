# Mapa del Sprint 2: historias, código y pantallas

Todo lo de este archivo sale del código del repositorio. Las rutas del API llevan el prefijo
`/api/v1`. El backend es NestJS (controlador → servicio → Prisma) y el frontend es Next.js.

## Roles reales del sistema

| Rol en el código | Nombre en pantalla |
|---|---|
| `ADMIN` | Administrador |
| `VETERINARIO` | Personal Veterinario |
| `GESTION` | Gestión Animal y Adopciones |
| `DIRECTIVO` | Personal Directivo |

El sistema tiene **un solo rol de gestión**. Las pruebas usan la cuenta
`adopciones.prueba@zoonosis.test` con ese rol.

## HU5 — Creación de Solicitud de Adopción

| | |
|---|---|
| Módulos | `backend/src/modules/adopters` y `backend/src/modules/adoptions` |
| Servicios | `AdoptersService` (`create`, `assertCiFree`, `maskCi`, `canSeeFullCi`) y `AdoptionsService.create` |
| Rutas | `GET /adopters` · `POST /adopters` · `GET /adopters/:id` · `PATCH /adopters/:id` · `POST /adoptions` |
| Pantallas | `/adoptantes` · `/adoptantes/nuevo` · `/adoptantes/[id]` · `/adoptantes/[id]/editar` · `/solicitudes` · `/solicitudes/nueva` |
| Quién crea | `GESTION` |
| Caja negra | `test/sprint2/e2e/hu5.spec.ts` |
| Caja blanca | `CB-HU5-A AdoptersService.assertCiFree` · `CB-HU5-B AdoptionsService.create` |
| Unitarias | `backend/src/modules/adopters/hu5.sprint2.unit.spec.ts` |

## HU6 — Recomendación de Compatibilidad Adoptante-Animal

| | |
|---|---|
| Módulo | `backend/src/modules/recommendation` (motor de reglas `engine.ts` y Random Forest en `ml/`) |
| Servicios | `RecommendationService` (`ranking`, `rankingForAnimal`, `pair`, `score`) y `MlService` (`train`, `activeForest`) |
| Rutas | `GET /recommendations/adopter/:adopterId` · `GET /recommendations/animal/:animalId` · `POST /recommendations` · `GET /ml/status` · `POST /ml/train` |
| Pantallas | `/adoptantes/[id]` (botón «Ver animales recomendados») · `/animales/[id]`, pestaña «Adoptantes compatibles» · `/admin/modelo` |
| Quién consulta | `GESTION` |
| Quién entrena el modelo | `ADMIN` |
| Caja negra | `test/sprint2/e2e/hu6.spec.ts` (el modelo se entrena antes en `00-modelo.spec.ts`) |
| Caja blanca | `CB-HU6-A RecommendationService.score` · `CB-HU6-B levelFor` |
| Unitarias | `backend/src/modules/recommendation/hu6.sprint2.unit.spec.ts` |

## HU10 — Gestión de Períodos de Cuarentena

| | |
|---|---|
| Módulos | `backend/src/modules/clinical` (períodos y controles) y `backend/src/modules/animals` (situación del animal) |
| Servicios | `ClinicalService` (`startPeriod`, `addControl`, `closePeriod`), `AnimalStatusService.syncClinicalStatus` y `AnimalsService.enableAdoption` |
| Rutas | `GET /periods` · `GET /animals/:id/periods` · `POST /animals/:id/periods` · `POST /periods/:id/controls` · `POST /periods/:id/close` · `POST /animals/:id/enable-adoption` |
| Pantallas | `/animales/[id]` (botón «Iniciar cuarentena», pestaña «Cuarentena») · `/cuarentena` |
| Quién abre períodos | `VETERINARIO` o `GESTION` |
| Quién registra controles y cierra | `VETERINARIO` |
| Caja negra | `test/sprint2/e2e/hu10.spec.ts` |
| Caja blanca | `CB-HU10-A ClinicalService.closePeriod` · `CB-HU10-B AnimalsService.enableAdoption` |
| Unitarias | `backend/src/modules/clinical/hu10.sprint2.unit.spec.ts` |

## HU11 — Gestionar Proceso de Adopción

| | |
|---|---|
| Módulo | `backend/src/modules/adoptions` |
| Servicio | `AdoptionsService` (`changeStatus`, `addNote`, `decide`, `act`) y `request-status.ts` |
| Rutas | `GET /adoptions` · `GET /adoptions/:id` · `PATCH /adoptions/:id/status` · `POST /adoptions/:id/notes` · `POST /adoptions/:id/decision` · `GET /adoptions/:id/act` |
| Pantallas | `/solicitudes/[id]` (botones «Pasar a evaluación», «Agregar nota», «Registrar resultado», «Cancelar», «Generar acta») · `/solicitudes/[id]/acta` |
| Quién decide | `GESTION` |
| Caja negra | `test/sprint2/e2e/hu11.spec.ts` |
| Caja blanca | `CB-HU11-A AdoptionsService.decide` · `CB-HU11-B AdoptionsService.act` |
| Unitarias | `backend/src/modules/adoptions/hu11.sprint2.unit.spec.ts` |

## Entorno de prueba

| | |
|---|---|
| Base de datos | PostgreSQL 16 en Docker, contenedor `zoonosis-db-test`, puerto 5433, base `zoonosis_test` (la misma del Sprint 1) |
| Variables | `.env.test` en la raíz del repositorio (sin versionar) |
| Seed | `test/sprint2/seed-sprint2.ts` (se niega a ejecutarse si la base no es la de prueba) |
| Caja negra | Playwright con Chromium, ventana de 1280 × 800, en `test/sprint2/` |
| Caja blanca y unitarias | Jest, archivos `*.sprint2.spec.ts` y `hu*.sprint2.unit.spec.ts` dentro de `backend/src/modules/` |

## Cómo repetir las pruebas

```bash
# 1. Base de prueba
docker start zoonosis-db-test

# 2. Backend y frontend apuntando a la base de prueba
cd backend && set -a && . ../.env.test && set +a && npm run build && node dist/main
cd frontend && BACKEND_URL=http://127.0.0.1:4000 npm run build && npx next start -p 3000

# 3. Datos de prueba y caja negra (entrena el modelo y genera las capturas)
cd backend && set -a && . ../.env.test && set +a && npx tsx ../test/sprint2/seed-sprint2.ts
cd test/sprint2 && npx playwright test

# 4. Caja blanca, unitarias, cobertura, salidas y capturas de la terminal
sh test/sprint2/ejecutar-jest.sh

# 5. Armar y validar el entregable
node test/sprint2/generar-resultados.js
node docs/pruebas-sprint2/unitarias/generar-unitarias.js
node docs/pruebas-sprint2/validar.js
```

## De dónde sale cada dato

| Dato | Origen |
|---|---|
| `datos_entrada` y `resultado_obtenido` de caja negra | Lo que cada prueba de Playwright cargó y leyó de la pantalla (`test/sprint2/evidencia/caja-negra/`) |
| `codigo` de caja blanca | Extraído por script de los archivos fuente; solo se le agregan los números de nodo |
| `resultado` de cada camino | `caja-blanca-resultado.json` (Jest) |
| `estado` y `tiempo_ms` de las unitarias | `unitarias/jest-resultado.json` (Jest) |
| Cobertura | `unitarias/cobertura/coverage-summary.json` |
| Datos del Random Forest | Informe real del entrenamiento (`test/sprint2/evidencia/modelo.json`) |
