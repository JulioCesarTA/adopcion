# Mapa del Sprint 1: historias, código y pantallas

Todo lo de este archivo sale del código del repositorio. Las rutas del API llevan el prefijo
`/api/v1`. El backend es NestJS (controlador → servicio → Prisma) y el frontend es Next.js.

## Roles reales del sistema

| Rol en el código | Nombre en pantalla |
|---|---|
| `ADMIN` | Administrador |
| `VETERINARIO` | Personal Veterinario |
| `GESTION` | Gestión Animal y Adopciones |
| `DIRECTIVO` | Personal Directivo |
| `CLIENTE` | Cliente (portal público; no participa en el Sprint 1) |

El sistema tiene **un solo rol de gestión**. No existen dos roles separados de «Gestión Animal» y
«Gestión de Adopciones».

## HU1 — Gestión de Animal

| | |
|---|---|
| Módulo | `backend/src/modules/animals` |
| Controlador | `animals.controller.ts` |
| Servicio | `animals.service.ts` (`AnimalsService`) y `animal-status.service.ts` |
| Almacenamiento de fotos | `backend/src/modules/storage/storage.service.ts` |
| Rutas | `GET /animals` · `POST /animals` · `GET /animals/:id` · `PATCH /animals/:id` · `POST /animals/:id/photo` · `POST /animals/:id/exit` · `POST /animals/:id/readmit` |
| Pantallas | `/animales` · `/animales/nuevo` · `/animales/[id]` · `/animales/[id]/editar` |
| Componentes | `frontend/src/components/animals/animal-form.tsx`, `animal-photo.tsx` |
| Quién registra y edita | `GESTION` |
| Caja negra | `test/sprint1/e2e/hu1.spec.ts` |
| Caja blanca | `AnimalsService.create`, `AnimalsService.update`, `AnimalsService.savePhoto` → `animals.sprint1.spec.ts` |

Formato real del código del animal: `ZOO-AAAA-NNNN` (por ejemplo, `ZOO-2026-0007`).

## HU2 — Registro de Consulta Clínica

| | |
|---|---|
| Módulo | `backend/src/modules/clinical` |
| Controlador | `clinical.controller.ts` |
| Servicio | `clinical.service.ts` (`ClinicalService`) |
| Rutas | `GET /animals/:id/consultations` · `POST /animals/:id/consultations` · `GET /consultations/:id` · `PATCH /consultations/:id` · `POST /consultations/:id/diagnoses` · `POST /consultations/:id/treatments` · `PATCH /treatments/:id` · `POST /treatments/:id/medications` |
| Pantallas | `/animales/[id]/consultas/nueva` · `/animales/[id]/consultas/[consultaId]` |
| Quién registra | `VETERINARIO` |
| Quién corrige | `VETERINARIO` autor de la consulta o `ADMIN` |
| Caja negra | `test/sprint1/e2e/hu2.spec.ts` |
| Caja blanca | `ClinicalService.createConsultation` → `clinical.sprint1.spec.ts` |

Los rangos de los signos vitales (temperatura de 30 a 45 °C y peso mayor que cero) se validan en
`dto/clinical.dto.ts`, antes de que la petición llegue al servicio.

## HU3 — Gestionar Historial Clínico

| | |
|---|---|
| Módulos | `backend/src/modules/animals` (línea de tiempo) y `backend/src/modules/clinical` (corrección) |
| Servicio | `AnimalsService.timeline` y `ClinicalService.updateConsultation` |
| Rutas | `GET /animals/:id/timeline` · `PATCH /consultations/:id` · `PATCH /treatments/:id` · `PATCH /vaccinations/:id` |
| Pantalla | `/animales/[id]`, pestaña «Historial clínico» |
| Componente | `frontend/src/components/clinical/timeline.tsx` |
| Caja negra | `test/sprint1/e2e/hu3.spec.ts` |
| Caja blanca | `ClinicalService.updateConsultation` → `clinical.sprint1.spec.ts` |

No existe ninguna ruta `DELETE` en los controladores `clinical` ni `animals`: los registros
clínicos no se pueden borrar.

## HU4 — Gestión de Vacunación

| | |
|---|---|
| Módulos | `backend/src/modules/clinical` (vacunaciones) y `backend/src/modules/catalogs` (catálogo) |
| Servicio | `ClinicalService.createVaccination`, `ClinicalService.upcomingVaccinations`, `CatalogsService` |
| Rutas | `GET /animals/:id/vaccinations` · `POST /animals/:id/vaccinations` · `PATCH /vaccinations/:id` · `GET /vaccinations/upcoming` · `GET /vaccines` · `POST /vaccines` · `PATCH /vaccines/:id` |
| Pantallas | `/animales/[id]`, pestaña «Vacunas» · `/vacunas` (pestañas «Próximas a vencer» y «Catálogo») |
| Componentes | `frontend/src/components/clinical/vaccinations-panel.tsx`, `vaccine-catalog.tsx` |
| Quién aplica vacunas | `VETERINARIO` |
| Caja negra | `test/sprint1/e2e/hu4.spec.ts` |
| Caja blanca | `ClinicalService.createVaccination` → `clinical.sprint1.spec.ts` |

`upcomingVaccinations` es una única consulta SQL sin decisiones en el código TypeScript, por lo que
no se analizó con el camino básico. Su regla (última dosis de cada vacuna, sin animales que salieron
de la institución) quedó comprobada en la caja negra de HU4.

## HU8 — Gestión de Usuario

| | |
|---|---|
| Módulos | `backend/src/modules/auth` y `backend/src/modules/users` |
| Controladores | `auth.controller.ts`, `users.controller.ts` |
| Servicios | `auth.service.ts` (`AuthService`), `users.service.ts` (`UsersService`) |
| Rutas | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/me` · `POST /auth/change-password` · `GET /users` · `POST /users` · `GET /users/:id` · `PATCH /users/:id` · `PATCH /users/:id/active` · `POST /users/:id/reset-password` |
| Pantallas | `/login` · `/perfil` · `/admin/usuarios` |
| Quién administra cuentas | `ADMIN` |
| Caja negra | `test/sprint1/e2e/hu8.spec.ts` |
| Caja blanca | `AuthService.login` → `auth.sprint1.spec.ts`; `UsersService.setActive` y `UsersService.create` → `users.sprint1.spec.ts` |

## Entorno de prueba

| | |
|---|---|
| Base de datos | PostgreSQL 16 en Docker, contenedor `zoonosis-db-test`, puerto 5433, base `zoonosis_test` |
| Variables | `.env.test` en la raíz del repositorio (sin versionar) |
| Seed | `test/sprint1/seed-sprint1.ts` (se niega a ejecutarse si la base no es la de prueba) |
| Caja negra | Playwright con Chromium, ventana de 1280 × 800, en `test/sprint1/` |
| Caja blanca | Jest, archivos `*.sprint1.spec.ts` dentro de `backend/src/modules/` |

## Cómo repetir las pruebas

```bash
# 1. Base de prueba (una sola vez)
docker start zoonosis-db-test

# 2. Backend y frontend apuntando a la base de prueba
cd backend && set -a && . ../.env.test && set +a && npm run build && node dist/main
cd frontend && BACKEND_URL=http://127.0.0.1:4000 npm run build && npx next start -p 3000

# 3. Datos de prueba y caja negra (genera las capturas)
cd backend && set -a && . ../.env.test && set +a && npx tsx ../test/sprint1/seed-sprint1.ts
cd test/sprint1 && npx playwright test

# 4. Caja blanca
cd backend && npx jest sprint1 --json --outputFile=../test/sprint1/evidencia/jest-crudo.json
node test/sprint1/resumir-jest.js

# 5. Armar y validar el entregable
node test/sprint1/generar-resultados.js
node docs/pruebas-sprint1/validar.js
```

## De dónde sale cada dato de `resultados.json`

| Dato | Origen |
|---|---|
| `datos_entrada` y `resultado_obtenido` | Lo que cada prueba de Playwright cargó y leyó de la pantalla (`test/sprint1/evidencia/caja-negra/`) |
| `resultado_prueba` | `CORRECTO` solo si todas las comprobaciones de la prueba se cumplieron |
| `codigo` | Extraído por script de los archivos fuente; solo se le agregan los números de nodo |
| `resultado` de cada camino | El informe de Jest (`test/sprint1/evidencia/caja-blanca-jest.json`) |
| `complejidad` | Calculada a partir de los nodos y las aristas, y verificada por `validar.js` |
