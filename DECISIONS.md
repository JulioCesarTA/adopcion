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

## Despliegue — EC2, Docker, S3, nginx y CI/CD

Segundo cambio de alcance: el despliegue, que antes estaba explícitamente fuera.

65. **Almacenamiento de fotos con dos drivers** (`StorageService`): `local` escribe en disco y sirve en `/uploads` (desarrollo); `s3` sube al bucket y guarda la URL completa en `animals.photo_url`. Se elige con `STORAGE_DRIVER` y el resto del código no distingue cuál está activo. Como la URL guardada es absoluta en el caso de S3, las fotos subidas antes de un cambio de driver siguen funcionando.
66. **Credenciales de AWS por rol IAM de la instancia, no por claves**: si `AWS_ACCESS_KEY_ID` está vacía, el SDK usa su cadena de credenciales por defecto, que en EC2 resuelve el rol de la instancia. Así no hay claves de larga duración en el servidor. Las variables existen igual para poder correr en local.
67. **Lectura pública solo del prefijo `animals/`** en el bucket (`deploy/aws/s3-bucket-policy.json`): el navegador carga las fotos directo de S3, así que necesitan ser legibles, pero nadie puede escribir ni listar el resto. La alternativa más segura (CloudFront con Origin Access Control y bucket privado) queda documentada y se activa poniendo `S3_PUBLIC_BASE_URL`.
68. **Imágenes Docker sobre `node:24-slim` (Debian) y no Alpine**: Prisma necesita el binario de motor correcto y al generar el cliente dentro de la misma imagen Debian detecta `debian-openssl-3.0.x` automáticamente. Con Alpine habría que fijar `binaryTargets` a mano. `prisma` y `tsx` se movieron a `dependencies` porque el contenedor ejecuta `migrate deploy` y, en el primer despliegue, el seed.
69. **Las migraciones se aplican en el arranque del contenedor** (`backend/docker-entrypoint.sh` ejecuta `prisma migrate deploy` antes del `exec`): es idempotente y evita el paso manual olvidadizo. El seed solo corre si `RUN_SEED=true`, pensado para el primer despliegue.
70. **nginx enruta `/api/` directo al backend** en lugar de pasar por los rewrites de Next: ahorra un salto y la cookie httpOnly del refresh sigue siendo del mismo origen porque todo cuelga del mismo dominio. Los rewrites de Next se mantienen como respaldo y para el renderizado del servidor. `client_max_body_size 6m` por las fotos de 5 MB.
71. **Certificado TLS con el patrón de certificado temporal**: nginx no arranca si el archivo de certificado no existe, así que `init-letsencrypt.sh` crea uno autofirmado, levanta nginx, pide el real por el método webroot y recarga. La renovación la hace el contenedor `certbot` cada 12 h, y nginx recarga su configuración cada 6 h mediante un script en `/docker-entrypoint.d/` (certbot corre en otro contenedor y no puede señalizarle).
72. **Registro de imágenes GHCR y no ECR**: la autenticación usa el `GITHUB_TOKEN` que ya provee Actions, así que el CI/CD funciona sin ninguna credencial de AWS. Mover a ECR solo requiere cambiar el paso de login.
73. **Endpoint `GET /api/v1/health`** (público, sin auditar): verifica el API y que la base responda. Lo usan el `HEALTHCHECK` de las imágenes, nginx y la verificación posterior al despliegue del CI/CD.
74. **La base de datos no se expone a Internet**: el servicio `db` de `docker-compose.prod.yml` no declara `ports`, solo es alcanzable desde la red interna de Docker. El cambio a Amazon RDS queda documentado en `DEPLOY.md`.

## Modelo de recomendación con aprendizaje automático (Random Forest)

Tercer cambio de alcance: la sección 8 original definía solo la suma ponderada.

75. **Random Forest implementado en TypeScript, sin librería externa.** Las tres librerías de ML para Node (`ml-random-forest`, `ml-xgboost`, `ml-logistic-regression`) no se actualizan desde mayo de 2022; montar el núcleo del sistema sobre un paquete abandonado era un riesgo inaceptable. La implementación propia (`ml/cart.ts` + `ml/random-forest.ts`) es un módulo puro, determinista con semilla fija y cubierto por 46 pruebas unitarias, igual que `engine.ts`. Para la defensa también es preferible: se puede explicar el algoritmo línea por línea.
76. **Por qué un ensamble de árboles y no una red neuronal**: para datos tabulares los ensambles de árboles siguen superando al aprendizaje profundo (Grinsztajn et al., 2022, *«Why do tree-based models still outperform deep learning on tabular data?»*). Además capta interacciones que la suma ponderada no puede expresar — un departamento es excelente para un gato y malo para un perro grande, mientras que el motor de reglas aplica la misma penalización de espacio sin importar la especie.
77. **Se aceptan divisiones con ganancia de Gini cero** (igual que `min_impurity_decrease = 0` de scikit-learn). Exigir ganancia positiva impedía aprender interacciones tipo XOR: en el nodo raíz ninguna variable sola reduce la impureza, el árbol se detenía ahí y nunca llegaba al segundo nivel donde la interacción sí es separable. Una división de ganancia nula aporta 0 a la importancia de variables, así que no distorsiona ese cálculo. Cubierto por la prueba del XOR.
78. **Los filtros duros del motor de reglas van SIEMPRE antes del modelo y el modelo no los puede anular.** Son vetos de seguridad (un animal que no tolera niños nunca se recomienda a un hogar con niños), no criterios ponderables. Por eso `goodWithChildren` y `goodWithAnimals` tampoco son variables del modelo: dentro del conjunto de pares que pasan los filtros quedan determinadas y no aportan información.
79. **El motor de reglas queda como respaldo de arranque en frío**, no se elimina. Si no hay modelo activo, o el par no pasa los filtros duros, el puntaje lo calcula `engine.ts`. El puntaje de reglas se devuelve siempre en `ruleScore` para que el personal pueda contrastar ambos criterios. Es el patrón habitual en recomendadores en producción y permite operar desde el primer día.
80. **Explicación local por ablación de variables**, no SHAP. Para cada variable se vuelve a predecir reemplazándola por su mediana de entrenamiento, y la diferencia es su aporte a ese caso concreto (`aporte_j = p(x) − p(x con x_j := mediana_j)`). Es un método de oclusión, más simple que SHAP pero del mismo espíritu, sin dependencias y con un costo de 16 predicciones extra por caso. Conserva el desglose explicable que exige RN-08.
81. **Conjunto de datos sintético, declarado como tal.** Con 12 solicitudes resueltas no se puede entrenar nada: `ml/synthetic.ts` genera casos a partir de criterios de idoneidad de adopción responsable y un término aleatorio que representa los factores no observados (entrevista, situación económica). El generador **no reutiliza** `engine.ts` a propósito: si las etiquetas salieran del puntaje ponderado, el modelo solo reaprendería las reglas y la comparación sería circular. Cada modelo guarda su procedencia (`REAL`, `SINTETICO`, `MIXTO`) y la interfaz muestra la advertencia metodológica. **Las métricas sobre datos sintéticos validan que el canal de aprendizaje funciona; no son evidencia de capacidad predictiva sobre adopciones reales.**
82. **Resultado honesto de la comparación** (`npm run ml:benchmark`, 1200 casos sintéticos, validación cruzada de 5 pliegues): el motor de reglas **ordena** marginalmente mejor (ROC-AUC 0,837 contra 0,826) y alcanza más exactitud en su umbral óptimo (0,772 contra 0,758). Donde el modelo gana con claridad es en **calibración**: Brier 0,17 contra 0,30, porque el puntaje de reglas no es una probabilidad. La segunda ventaja, visible en el uso real, es el **efecto techo**: el motor de reglas asigna 100 a varios animales a la vez y no puede ordenarlos entre sí, mientras que el modelo los separa. No se ajustó el generador para fabricar una victoria del modelo.
83. **Versionado de modelos igual que `algorithm_settings`**: cada entrenamiento crea una fila en `ml_models` con el modelo serializado, sus métricas, la procedencia, el tamaño del conjunto y la semilla. Un índice único parcial (`uq_one_active_ml_model`) garantiza que solo haya un modelo activo, y se puede volver a una versión anterior. El modelo activo se guarda en memoria para no deserializarlo en cada predicción.
84. **Las cancelaciones se excluyen del entrenamiento.** Solo `APROBADA` (= 1) y `RECHAZADA` (= 0) son casos etiquetados; una solicitud `CANCELADA` no dice nada sobre la idoneidad del par (puede ser un cambio de planes del adoptante) y etiquetarla como fracaso introduciría sesgo.

## Reducción de alcance: fuera auditoría, alertas, reportes y pesos editables

Cambio pedido explícitamente para simplificar el sistema.

85. **Se eliminó por completo el subsistema de auditoría** (tabla `audit_logs`, su trigger de solo lectura, el interceptor global, el decorador `@SkipAudit` y 41 llamadas de registro en 12 servicios). **Con esto el sistema deja de cumplir RN-09** de la especificación original. La migración `20261114230000_quitar_auditoria` destruye el historial y no es reversible sin un respaldo previo.
86. **Consecuencia no evidente de quitar la auditoría**: la fecha y el motivo de un reingreso (CU22) no tenían columnas propias — vivían solo en el registro de auditoría (ver punto 24). Al quitarla se habrían descartado en silencio, así que se eliminaron del flujo completo (DTO, endpoint y formulario) en vez de simular que se guardan. Si hacen falta, corresponde agregar columnas al modelo `Animal`.
87. **Se eliminaron las alertas sanitarias**: la campana del topbar, la tarjeta del panel, la página `/alertas` y el endpoint `GET /alerts`. Las vacunas próximas a vencer siguen consultables en `/vacunas`, que es donde el veterinario las trabaja; lo que desaparece es la notificación proactiva (RN-12 deja de tener superficie visible).
88. **Los 8 reportes con exportación CSV se reemplazaron por 6 indicadores de gestión** (`/kpis`). Cada indicador responde una pregunta distinta y accionable, y se compara contra el periodo anterior de la misma duración para que el número tenga contexto: adopciones concretadas, permanencia hasta la adopción, animales devueltos, solicitudes recibidas, tiempo de evaluación y cobertura de vacunación. Se perdió la exportación a CSV y el acceso segmentado por categoría.
89. **El color de la tendencia cruza dirección con signo, no el signo solo**: un indicador puede subir y ser mala noticia (devoluciones) o bajar y ser buena (días de permanencia). Cada KPI declara si `mas-es-mejor` o `menos-es-mejor`.
90. **Se retiró la edición de los pesos del algoritmo** (`POST /algorithm-settings` y la pestaña correspondiente): el modelo entrenado la reemplaza. Los pesos siguen existiendo en la base con sus valores por defecto porque el motor de reglas los usa como respaldo de arranque en frío, pero ya no se editan desde la interfaz.
91. **El catálogo de vacunas se movió a `/vacunas`** como segunda pestaña, en lugar de desaparecer con `/admin/catalogos`. Quitar esa página sin reubicarlo habría dejado al administrador sin forma de dar de alta una vacuna, que es una regresión funcional ajena a lo que se pidió quitar.
92. **Ranking inverso de recomendación** (`GET /recommendations/animal/:id`): dado un animal, qué adoptantes registrados le convienen. Es el camino natural cuando el punto de partida es el animal. Solo considera adoptantes sin solicitud activa, no expone la CI y usa el mismo modelo y los mismos filtros duros que el ranking directo.
93. **El despliegue automático pasó de GHCR + SSH a ECR + SSM con OIDC** (reemplaza la decisión 72): con SSH había que guardar la clave privada de la instancia en los secretos del repositorio. Ahora GitHub asume el rol `zoonosis-github-actions` por OIDC, limitado a este repositorio, y dispara el redespliegue con `ssm:SendCommand` sobre una única instancia. El pipeline no usa ningún secreto.
94. **HTTPS sobre la IP elástica con Let's Encrypt** (perfil `shortlived`, 160 h): permite TLS de confianza sin dominio. Por la vida corta del certificado, certbot revisa cada 6 h y la plantilla de nginx omite HSTS: una renovación fallida no debe dejar el sitio inaccesible.
95. **Limpieza de código sin uso**: se eliminó lo que quedó inalcanzable tras retirar la edición de pesos (decisión 90) —`settingsHistory`, `createSettings` y sus DTO—, además de `diffDays`, `ACTIVE_REQUEST_STATES`, `stratifiedSplit`, `useConsultations`, `downloadFile` e `isStaff`, y tres dependencias de desarrollo que nadie importaba. `multer` pasó a declararse explícitamente porque el código lo importa.
