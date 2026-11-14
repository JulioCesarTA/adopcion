# Decisiones de implementación

Registro de decisiones tomadas donde la especificación era ambigua o el entorno obligó a elegir.
Formato: **decisión** — motivo.

## Fase 0 — Setup

1. **Monorepo simple sin workspaces** (`backend/` y `frontend/` con su propio `package.json`) — es lo que pide la sección 2; evita configuración extra de npm workspaces.
2. **Versiones fijadas**: Next.js 15, React 19, Tailwind 4, NestJS 11, **Prisma 6** y **zod 3** — Prisma 7 y zod 4 traen cambios incompatibles recientes (config de datasource, API de errores); se eligen las versiones estables conocidas.
3. **Jest 29 en el backend** (en lugar de 30) — Jest 30 usa un resolver nativo (`unrs-resolver`) que en Windows requiere el runtime de Visual C++, ausente en el equipo de desarrollo. Jest 29 es JS puro y cumple igual.
4. **`bcryptjs` en lugar de `bcrypt` nativo** — mismo algoritmo y formato de hash (cost 10, sección 11) sin compilar módulos nativos.
5. **Restricciones que Prisma no expresa** (CHECK, índices parciales `uq_one_active_request` / `uq_one_active_period`, índice `lower(name)`, índice parcial de `next_dose_date`) se agregan con SQL al final de la migración inicial. Verificado: `prisma migrate dev` no intenta borrarlos en migraciones posteriores.
6. **Esquema completo en la migración inicial** — se implementa toda la sección 6 de una vez para no fragmentar migraciones; los módulos que lo usan se agregan fase por fase.
7. **`audit_logs` de solo lectura también en BD**: un trigger impide `UPDATE`/`DELETE` (CU19: “no hay editar ni borrar”).
8. **`seed` con `tsx`** — ejecuta TypeScript sin configurar `ts-node` para el modo `nodenext`.

## Fase 1 — Auth y usuarios

9. **Hash del refresh token con SHA-256, no bcrypt** — bcrypt trunca a 72 bytes y todos los JWT de un mismo usuario comparten esos primeros bytes; SHA-256 es lo correcto para tokens aleatorios de alta entropía.
10. **Una sesión activa por usuario** — `users.refresh_token_hash` guarda un solo hash (así lo define el modelo); iniciar sesión en otro dispositivo invalida el refresh anterior. El refresh rota en cada uso.
11. **RN-10 se aplica consultando la BD en cada request** (`JwtAuthGuard` carga el usuario y verifica `is_active`) — así un access token ya emitido deja de funcionar de inmediato al desactivar la cuenta. Costo: una consulta por request, aceptable para 20 usuarios concurrentes.
12. **Bloqueo por intentos (CU01)**: al 5.º fallo seguido se bloquea 10 min y se responde **429** con los minutos restantes; durante el bloqueo se rechaza incluso la contraseña correcta. La cuenta inactiva solo se informa si la contraseña es correcta (si no, mensaje genérico) para no revelar qué cuentas existen.
13. **Proxy del API en Next (`rewrites` de `/api/v1` y `/uploads`)** — la cookie httpOnly del refresh queda en el dominio del frontend, el middleware de Next puede ver si hay sesión y se evitan problemas de cookies de terceros entre Vercel y Render. El backend igual configura CORS restringido a `FRONTEND_URL`.
14. **Auditoría híbrida (RN-09)**: los servicios registran entradas detalladas (`CREATE`, `UPDATE`, `STATUS_CHANGE`, `LOGIN`, `LOGOUT`, `PASSWORD_*`) con valores antes/después dentro de la misma transacción; el interceptor global registra una entrada genérica para cualquier POST/PATCH/DELETE que no haya dejado una. Se usa `AsyncLocalStorage` para pasar usuario e IP. Claves sensibles (`password`, `token`, …) se eliminan antes de guardar.
15. **`/auth/refresh` no se audita** (sería ruido cada 15 min); login fallido tampoco, salvo el bloqueo de cuenta (`ACCOUNT_LOCKED`).
16. **Errores de “no puedes desactivarte / cambiar tu propio rol” → 400** — la spec no fija el código; es un error de la petición, no un conflicto de estado.
17. ~~Rutas de fases futuras con “Sección en construcción”~~ — reemplazadas por las páginas reales en las fases 2–6.
18. **Los tests e2e usan la BD de desarrollo** y dejan datos de prueba (usuario `e2e-…@zoonosis.test`, un animal `E2E …` en estado DEVUELTO y un adoptante `E2E…`). No se pueden borrar porque la auditoría los referencia; si molestan, recrear la BD con `npm run db:reset`.

## Fase 2 — Animales

19. **Código ZOO-AAAA-NNNN**: el año es el de registro en hora de Bolivia; el correlativo se calcula dentro de la transacción con un `pg_advisory_xact_lock` para evitar duplicados concurrentes. El correlativo reinicia cada año.
20. **Foto**: se valida por *magic bytes* (JPG/PNG/WEBP), no por el mimetype enviado; máx. 5 MB. Se guarda en `UPLOAD_DIR/animals` y se sirve en `/uploads`. Al reemplazarla se borra la anterior. En producción conviene un almacenamiento persistente (disco del servicio o un bucket).
21. **“En estados finales solo notas” (CU04)**: en ADOPTADO / FALLECIDO / DEVUELTO solo se editan `physical_description`, `special_care_notes` y `exit_notes` (los campos de texto libre); cualquier otro campo → 409.
22. **Salida “otro” (CU22)**: el enum de estados solo tiene FALLECIDO y DEVUELTO, así que “otro” se registra como estado DEVUELTO (salida de la institución) con `exit_reason = "OTRO: <detalle>"`.
23. **Al registrar la salida** se cierra automáticamente el periodo de observación/cuarentena activo y los tratamientos activos pasan a SUSPENDIDO (no se borra nada, RN-02); todo queda auditado.
24. **Reingreso (CU22)**: solo desde ADOPTADO → INGRESADO; limpia los campos de salida y guarda la fecha y el motivo en la auditoría (no hay columnas para ello en el modelo).
25. **Borrado lógico**: no se expone un endpoint de borrado de animales (la spec no lo pide); todas las consultas filtran `deleted_at IS NULL`.

## Fase 3 — Clínico

26. **Estado clínico derivado** con precedencia *periodo activo > tratamiento activo > ingresado*. Se recalcula al iniciar/cerrar periodos y al crear o cambiar de estado tratamientos. Para que esto funcione, el grafo de la sección 4 se extiende con: observación/cuarentena ↔ tratamiento. Cualquier otra transición sigue respondiendo 409.
27. **“Retirar de adopción” (CU21)** agrega la transición DISPONIBLE_ADOPCION → INGRESADO. Además, si a un animal disponible se le registra un tratamiento o un periodo, se retira automáticamente de adopción (deja de cumplir RN-03). Con una solicitud activa no se puede iniciar un periodo (409).
28. **Tratamiento SUSPENDIDO** cuenta como no activo (igual que FINALIZADO). Al finalizar/suspender sin fecha de fin se registra la de hoy.
29. **RN-02**: consultas, tratamientos y vacunas se corrigen solo por su autor (veterinario) o un ADMIN; por eso esos `PATCH` admiten el rol ADMIN aunque ADMIN no registre datos clínicos. Diagnósticos y medicamentos no tienen edición en v1 (la spec solo define POST).
30. **Cerrar un periodo sin controles (CU09)** responde 409 con `errors[0].field = "confirmWithoutControls"`; la UI pide confirmación y reenvía con `confirmWithoutControls: true`.
31. **Vacuna fuera de especie (CU08)**: se guarda igual y la respuesta incluye `warnings[]`. Las vacunas desactivadas no se pueden aplicar.
32. **Alertas de vacunas (RN-12)** usan solo la **última dosis** de cada vacuna por animal y excluyen animales fuera de la institución (adoptados, fallecidos, devueltos), para no alertar por dosis ya reemplazadas.
33. **`GET /periods` y `GET /vaccinations/upcoming`** se agregan a la API de la sección 9 porque las páginas `/cuarentena` y `/vacunas` los necesitan.
34. **Fechas**: las columnas `date` (vacunas, tratamientos) se manejan como fecha calendario (`YYYY-MM-DD`, medianoche UTC) y el front las formatea en UTC para no correrse un día; los `timestamptz` se muestran en America/La_Paz.

## Fase 4 — Adopciones

35. **Lectura de adoptantes y solicitudes**: GESTION gestiona; ADMIN y DIRECTIVO pueden consultar (lo exige el sidebar de la sección 10.2), con la CI enmascarada para DIRECTIVO (CU10).
36. **CI duplicada** → 409 con `errors.existingAdopterId` para enlazar al adoptante existente.
37. **RN-05** se garantiza dos veces: verificación en el servicio (con bloqueo `FOR UPDATE` del animal) y el índice único parcial en BD (si dos peticiones llegan a la vez, la segunda recibe 409).
38. **Notas de evaluación**: `evaluation_notes` acumula notas con fecha, autor y estado (`[fecha · usuario · estado] texto`) en vez de sobrescribirse. Se agrega `POST /adoptions/:id/notes` para añadir notas sin cambiar el estado (CU12).
39. **Transiciones de la solicitud**: `PATCH /status` solo acepta EN_EVALUACION y CANCELADA; aprobar/rechazar es exclusivamente `POST /decision` (CU14), que exige estado EN_EVALUACION, nota y, si se aprueba, fecha de entrega.
40. **Orden de validación**: primero el cuerpo de la petición (400) y luego el estado (409).

## Fase 5 — Recomendación y cierre

41. **Redondeo**: el puntaje se redondea a 2 decimales solo al final (el ejemplo 8.4, 90.625, queda en **90.63 → ALTA**); los puntos por criterio se muestran redondeados a 2 decimales.
42. **Filtro duro “animal disponible”** en modo par: si se calcula desde una solicitud activa (animal EN_PROCESO_ADOPCION) se evalúa como disponible, porque el animal está reservado precisamente para ese adoptante.
43. **Ranking**: guarda una fila en `compatibility_recommendations` por cada animal evaluado (`createMany`). Un animal con datos incompletos se omite del ranking y se informa en `skipped`; si faltan datos del adoptante, toda la recomendación responde 422.
44. **Empates del ranking** se ordenan por código de animal (orden estable y reproducible).
45. **Versiones del algoritmo**: cada guardado crea una fila nueva con `version = max + 1` (con advisory lock). El umbral MEDIA debe ser menor que el ALTA.
46. **Acta (CU26)**: `GET /adoptions/:id/act` devuelve los datos y el front arma la vista imprimible con `window.print()`; los compromisos de tenencia son un texto fijo en el backend.

## Fase 6 — Panel, reportes y auditoría

47. **Panel**: cada indicador se calcula por separado y devuelve `{ ok, data }` o `{ ok: false, error }`, de modo que un fallo no rompe el resto (CU18). “En cuarentena” cuenta cuarentena + observación.
48. **Acceso a reportes por categoría**: GENERAL (animales por estado, ingresos por mes) para todos los roles; SANITARIO (vacunaciones, vacunas próximas, tratamientos activos, cuarentena) para VETERINARIO; ADOPCIONES (adopciones por mes, tiempo promedio) para GESTION; ADMIN y DIRECTIVO ven todo.
49. **CSV** separado por `;`, con BOM UTF-8 y coma decimal, para que Excel en español lo abra bien.
50. **Tiempo promedio ingreso → adopción** usa la fecha de entrega (o la de decisión si falta) de las adopciones aprobadas en el rango.
51. **Rango de reportes** por defecto: los últimos 12 meses; máximo 5 años.
52. **Gráficos**: paleta categórica validada en orden fijo, una sola serie sin leyenda, leyenda desde 2 series, tooltip al pasar el cursor y tabla de datos siempre visible.

## Fase 7 — Pulido

53. **Jest 29** se mantiene en el backend (ver punto 3). Los tests e2e de negocio (`test/business-rules.e2e-spec.ts`) cubren RN-03 a RN-07, transiciones de estado, CU16, CU17 y CU19.
54. **Playwright** (opcional en la spec) no se incluye; la UI se verificó compilando y con el flujo completo vía HTTP a través del proxy de Next.

## Ampliación — Sitio público, rol CLIENTE, contacto por correo y asistente con IA

Cambio de alcance pedido explícitamente (la sección 13 original dejaba fuera el portal público).

55. **Rol `CLIENTE`** (nuevo valor del enum `user_role`): el cliente se registra solo desde `/registro`, entra a `/portal` y ve los animales disponibles, el asistente y su perfil. No accede al sistema de gestión.
56. **Deny by default**: el `RolesGuard` ahora trata un endpoint sin `@Roles()` como *solo personal interno* (ADMIN, VETERINARIO, GESTION, DIRECTIVO). Un cliente solo entra donde se le abre explícitamente (`@Roles(...ALL_ROLES)` en `/auth/me`, cambio de contraseña). Así ningún endpoint interno queda expuesto por olvido. Cubierto por `roles.guard.spec.ts` y `test/public.e2e-spec.ts`.
57. **Aceptaciones con casilla**: (a) registro → «Acepto los Términos y la Política de Privacidad», obligatoria en el front y en el back (`@Equals(true)`), se guarda `users.terms_accepted_at`; (b) contacto → «Acepto el tratamiento de mis datos», se guarda `contact_messages.privacy_accepted_at`; (c) banner de cookies con «Aceptar / Solo necesarias» (preferencia en `localStorage`; el sitio solo usa la cookie de sesión).
58. **Animales públicos** (`GET /public/animals`): solo animales `DISPONIBLE_ADOPCION` y solo campos públicos (sin motivo de ingreso, notas, HCD ni ids de usuarios).
59. **Correo**: nodemailer con SMTP genérico configurable por entorno. Recomendado: **Mailtrap Sandbox** en desarrollo (atrapa los correos) y **Resend** o **Brevo** en producción. Cada mensaje se guarda en `contact_messages` aunque el envío falle o no haya SMTP, y el personal lo ve en **Mensajes web** (`/mensajes`, ADMIN y GESTION). Se envía aviso a `CONTACT_TO` (con `Reply-To` del visitante) y un acuse de recibo al visitante.
60. **Anti-spam del contacto**: límite de 5 envíos por minuto por IP y un campo trampa oculto (`website`).
61. **Asistente con Claude** (`POST /api/v1/chat`, público, 15 solicitudes/min por IP): modelo `claude-opus-5-5` por defecto (configurable con `CHAT_MODEL`), `effort: low`, respaldo automático de servidor ante rechazos (`fallbacks: "default"`), prompt del sistema estable y cacheado + bloque variable con los animales disponibles. El historial llega del navegador y se valida (solo `user`/`assistant`, alternados, ≤ 20 turnos, ≤ 2000 caracteres). No se guardan las conversaciones. Sin `ANTHROPIC_API_KEY` responde 503 con un mensaje amable.
62. **El cliente no crea solicitudes de adopción** (opción elegida): expresa interés con «Me interesa», que precarga el formulario de contacto; el personal crea la solicitud desde el sistema tras la entrevista.
63. **Íconos de redes**: la versión instalada de lucide ya no trae íconos de marcas; se dibujaron íconos de trazo propios y siempre van con el nombre de la red.
64. **Textos legales** (`/terminos`, `/privacidad`): son un modelo razonable; deben revisarse con un asesor legal antes de publicar.
