# Mapa del Sprint 3: historias, código y pantallas

Todo lo de este archivo sale del código del repositorio. Las rutas del API llevan el prefijo
`/api/v1`. El backend es NestJS (controlador → servicio → Prisma) y el frontend es Next.js.

## Roles reales del sistema

| Rol en el código | Nombre en pantalla |
|---|---|
| `ADMIN` | Administrador |
| `VETERINARIO` | Personal Veterinario |
| `GESTION` | Gestión Animal y Adopciones |
| `DIRECTIVO` | Personal Directivo |
| `CLIENTE` | Cliente (portal público) |
| — | Visitante (sin iniciar sesión) |

## HU7 — Panel de KPI en Tiempo Real

| | |
|---|---|
| Módulos | `backend/src/modules/dashboard` y `backend/src/modules/kpis` |
| Servicios | `DashboardService` (`dashboard`, `section`, `cards`, `byStatus`, `entriesVsAdoptions`, `latestRequests`) y `KpisService` (`kpis`, `build` y los seis indicadores) |
| Rutas | `GET /dashboard` · `GET /kpis?months=3|6|12` |
| Pantallas | `/dashboard` («Panel») · `/kpis` («Indicadores de gestión») |
| Quién ve | Todo el personal interno; el Personal Veterinario no ve las últimas solicitudes; el cliente no accede |
| Caja negra | `test/sprint3/e2e/hu7.spec.ts` |
| Caja blanca | `CB-HU7-A DashboardService.section` · `CB-HU7-B DashboardService.dashboard` · `CB-HU7-C KpisService.build` |
| Unitarias | `backend/src/modules/dashboard/hu7.sprint3.unit.spec.ts` |

## HU9 — Asistente Virtual con IA

| | |
|---|---|
| Módulo | `backend/src/modules/chat` |
| Servicio | `ChatService` (`reply`, `validate`) y `chat-prompt.ts` (`stableSystemPrompt`, `adoptablesPrompt`) |
| Ruta | `POST /chat` (pública, límite de 15 consultas por minuto por visitante) |
| Pantallas | Ventana flotante «Asistente virtual» del sitio público (`/`) · `/portal/asistente` |
| Servicio de IA | SDK de Anthropic; se activa solo si existe `ANTHROPIC_API_KEY` |
| Caja negra | `test/sprint3/e2e/hu9.spec.ts` (servicio de IA no disponible) |
| Caja blanca | `CB-HU9-A ChatService.validate` · `CB-HU9-B ChatService.reply` |
| Unitarias | `backend/src/modules/chat/hu9.sprint3.unit.spec.ts` |

## HU12 — Seguimiento Post-adopción

| | |
|---|---|
| Módulo | `backend/src/modules/adoptions` |
| Servicio | `AdoptionsService` (`createFollowup`, `listFollowups`, `approvedOrThrow`) y `AnimalsService.findOne` (seguimientos en la ficha del animal) |
| Rutas | `GET /adoptions/:id/followups` · `POST /adoptions/:id/followups` · `GET /animals/:id` |
| Pantallas | `/solicitudes/[id]` (sección «Seguimiento posterior a la adopción», botón «Nuevo seguimiento») · `/animales/[id]`, pestaña «Adopción» |
| Quién registra | `GESTION` |
| Caja negra | `test/sprint3/e2e/hu12.spec.ts` |
| Caja blanca | `CB-HU12-A AdoptionsService.createFollowup` · `CB-HU12-B AdoptionsService.listFollowups` |
| Unitarias | `backend/src/modules/adoptions/hu12.sprint3.unit.spec.ts` |

## Entorno de prueba

| | |
|---|---|
| Base de datos | PostgreSQL 16 en Docker, contenedor `zoonosis-db-test`, puerto 5433, base `zoonosis_test` (la misma de los sprints anteriores) |
| Variables | `.env.test` en la raíz del repositorio (sin versionar). No contiene la clave de la API de Anthropic. |
| Seed | `test/sprint3/seed-sprint3.ts` (se niega a ejecutarse si la base no es la de prueba) |
| Caja negra | Playwright con Chromium, ventana de 1280 × 800, en `test/sprint3/` |
| Caja blanca y unitarias | Jest, archivos `*.sprint3.spec.ts` y `hu*.sprint3.unit.spec.ts` dentro de `backend/src/modules/` |

## Cómo repetir las pruebas

```bash
# 1. Base de prueba
docker start zoonosis-db-test

# 2. Backend y frontend apuntando a la base de prueba
cd backend && set -a && . ../.env.test && set +a && npm run build && node dist/main
cd frontend && BACKEND_URL=http://127.0.0.1:4000 npm run build && npx next start -p 3000

# 3. Datos de prueba y caja negra (genera las capturas)
cd backend && set -a && . ../.env.test && set +a && npx tsx ../test/sprint3/seed-sprint3.ts
cd test/sprint3 && npx playwright test

# 4. Caja blanca, unitarias, cobertura, salidas y capturas de la terminal
sh test/sprint3/ejecutar-jest.sh

# 5. Armar y validar el entregable
node test/sprint3/generar-resultados.js
node docs/pruebas-sprint3/unitarias/generar-unitarias.js
node docs/pruebas-sprint3/validar.js
```
