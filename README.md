# Zoonosis SCZ — Gestión de adopciones y trazabilidad sanitaria animal

Plataforma web interna para la Asociación de Zoonosis de Santa Cruz de la Sierra.
La especificación completa está en `../PROYECTO_ZOONOSIS_CLAUDE_CODE.md`; las decisiones de implementación, en [DECISIONS.md](DECISIONS.md).

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router, TypeScript) + Tailwind CSS 4 + TanStack Query |
| Backend | NestJS 11 (TypeScript), API REST en `/api/v1`, Swagger en `/api/docs` |
| Base de datos | PostgreSQL 16 + Prisma 6 |
| Auth | JWT propio (access 15 min en memoria + refresh 7 días en cookie httpOnly), bcrypt |
| Despliegue | Docker en AWS EC2, nginx + Let's Encrypt, fotos en S3, CI/CD con GitHub Actions — ver [DEPLOY.md](DEPLOY.md) |

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Setup: monorepo, Docker, NestJS + Prisma, Next + Tailwind | ✅ |
| 1 | Auth y usuarios (CU01, 02, 20, 25), layout con sidebar | ✅ |
| 2 | Animales (CU03, 04, 22): código, foto, filtros, ficha con pestañas, salida/reingreso | ✅ |
| 3 | Clínico (CU05–09, 21): consultas, diagnósticos, tratamientos, medicamentos, vacunas, cuarentena, HCD, RN-03 | ✅ |
| 4 | Adopciones (CU10, 11, 12, 14, 24): adoptantes, solicitudes, máquina de estados, catálogo de adoptables | ✅ |
| 5 | Recomendación y cierre (CU13, 15, 16, 26): motor + tests, ranking, pesos editables, seguimientos, acta | ✅ |
| 6 | Panel, alertas, reportes y auditoría (CU17, 18, 19, 23) | ✅ |
| 7 | Pulido (permisos, estados vacíos/errores, responsive, tests e2e, README) | ✅ |
| + | Sitio público (landing, redes, términos, privacidad, cookies), registro de clientes, contacto por correo y asistente con IA | ✅ |
| + | Despliegue: Docker, nginx + HTTPS (Let's Encrypt), fotos en S3, CI/CD en GitHub Actions para EC2 | ✅ (falta configurar las claves) |

## Estructura

```
zoonosis/
├─ docker-compose.yml        PostgreSQL 16
├─ DECISIONS.md              decisiones de implementación
├─ backend/                  NestJS
│  ├─ prisma/                schema.prisma, migraciones, seed.ts
│  ├─ test/                  e2e (auth, reglas de negocio)
│  └─ src/
│     ├─ common/             guards (JWT, roles), decoradores, filtro de errores, DTOs base
│     └─ modules/
│        ├─ auth/ users/ audit/
│        ├─ animals/         CRUD, estados (animal-status.ts), foto, HCD
│        ├─ clinical/        consultas, tratamientos, vacunas, cuarentena
│        ├─ adopters/ adoptions/
│        ├─ recommendation/  engine.ts (función pura) + servicio
│        ├─ catalogs/        vacunas y pesos del algoritmo
│        ├─ dashboard/       panel y alertas
│        └─ reports/         reportes + CSV
└─ frontend/                 Next.js (App Router)
   └─ src/
      ├─ app/(app)/          páginas autenticadas (sidebar + topbar)
      ├─ app/login/
      ├─ components/         ui/, layout/, animals/, clinical/, adoptions/, …
      ├─ hooks/              TanStack Query por dominio
      └─ lib/                api.ts (cliente + refresh), auth, roles, labels, utils
```

## Requisitos

- Node.js 20+ (probado con 26) y npm
- Docker Desktop (para PostgreSQL)

## Puesta en marcha

```bash
# 1. Base de datos
docker compose up -d

# 2. Backend (http://localhost:4000)
cd backend
cp .env.example .env
npm install
npm run db:setup        # aplica migraciones + seed
npm run start:dev

# 3. Frontend (http://localhost:3000), en otra terminal
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Swagger: <http://localhost:4000/api/docs>

> Con npm 11+ los scripts de instalación de dependencias están bloqueados por defecto. El `package.json` del backend ya aprueba los de Prisma y esbuild (`allowScripts`); si `npm install` avisa de otros, revísalos con `npm install-scripts ls`.

El seed crea además datos de ejemplo (12 animales en distintos estados con su HCD, 5 adoptantes, 3 solicitudes, alertas de vacunas y periodos de cuarentena/observación), solo si la BD aún no tiene animales.

## Tests

```bash
cd backend
npm test            # unitarios: motor de recomendación (sección 8.4), máquinas de estado, auth, auditoría
npm run test:e2e    # e2e contra la BD local: login, usuarios, crear animal, RN-03…RN-07, transiciones
```

## Sitio público y portal de clientes

| Ruta | Qué es |
|---|---|
| `/` | Landing: servicios, animales en adopción, cómo adoptar, preguntas frecuentes, «Contáctame», redes sociales, asistente virtual y aviso de cookies |
| `/registro` | Registro de clientes (casilla obligatoria de Términos y Privacidad) |
| `/terminos`, `/privacidad` | Términos y Condiciones; Política de Privacidad y Cookies (texto modelo: revisarlo con un asesor legal) |
| `/portal` | Portal del cliente: adoptables, «Me interesa», asistente y perfil |
| `/mensajes` | Buzón del formulario de contacto (ADMIN y GESTION) |

### Configurar el correo (formulario «Contáctame»)

1. Crea una cuenta gratuita en **Mailtrap** → *Email Testing* → *Inboxes* → *SMTP Settings*.
2. Copia los datos en `backend/.env`: `SMTP_HOST=sandbox.smtp.mailtrap.io`, `SMTP_PORT=2525`, `SMTP_USER`, `SMTP_PASS`.
3. Reinicia el API. Los correos aparecerán en la bandeja de Mailtrap (no llegan a nadie real).

En producción usa **Resend** (`smtp.resend.com`, puerto 465, `SMTP_SECURE=true`, usuario `resend`, contraseña = API key) o **Brevo**, con un dominio verificado en `MAIL_FROM`. Sin SMTP, los mensajes igual se guardan y se ven en `/mensajes`.

### Configurar el asistente con IA

1. Crea una API key en <https://console.anthropic.com> (*API Keys*).
2. Ponla en `backend/.env`: `ANTHROPIC_API_KEY=sk-ant-...` y reinicia el API.
3. Modelo por defecto: `claude-opus-5-5`. Para abaratar, `CHAT_MODEL=claude-haiku-5-5`.

Datos de la institución y redes sociales: variables `INSTITUTION_*` y `SOCIAL_*` de `backend/.env` (**reemplaza los valores de ejemplo por los reales**).

## Despliegue en producción

La guía completa está en **[DEPLOY.md](DEPLOY.md)**. En resumen:

```bash
# En la instancia EC2 (Ubuntu 24.04)
./deploy/ec2-setup.sh                       # Docker, cortafuegos, swap
cp .env.production.example .env && nano .env
./deploy/init-letsencrypt.sh                # certificado TLS + levanta todo
```

| Pieza | Archivo |
|---|---|
| Imágenes Docker (multi-etapa) | `backend/Dockerfile`, `frontend/Dockerfile` |
| Orquestación de producción | `docker-compose.prod.yml` |
| nginx + HTTPS | `deploy/nginx/templates/app.conf.template` |
| Certificado y renovación | `deploy/init-letsencrypt.sh` + contenedor `certbot` |
| Políticas de AWS | `deploy/aws/iam-policy-ec2.json`, `deploy/aws/s3-bucket-policy.json` |
| CI (lint, tipos, 80 pruebas, build de imágenes) | `.github/workflows/ci.yml` |
| CD (publica en GHCR y despliega por SSH) | `.github/workflows/deploy.yml` |

Las fotos de los animales se guardan en S3 con `STORAGE_DRIVER=s3` (en EC2, usando
el rol IAM de la instancia: sin claves en el servidor) o en disco con
`STORAGE_DRIVER=local`, que es el valor por omisión para desarrollo.

## Usuarios de prueba (solo desarrollo)

Contraseña de todos: **`Zoo12345`**

| Email | Rol |
|---|---|
| admin@zoonosis.test | Administrador |
| vet@zoonosis.test | Personal Veterinario |
| gestion@zoonosis.test | Gestión Animal y Adopciones |
| directivo@zoonosis.test | Personal Directivo |

## Variables de entorno

**backend/.env** (ver `backend/.env.example`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `PORT` | Puerto del API (4000) |
| `FRONTEND_URL` | Origen permitido por CORS |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Secretos de firma (largos y aleatorios en producción) |
| `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_DAYS` | Vigencia de los tokens (900 s / 7 días) |
| `COOKIE_SECURE`, `COOKIE_SAMESITE` | `true` / `lax` en producción con HTTPS |
| `UPLOAD_DIR` | Carpeta de fotos de animales |

**frontend/.env.local** (ver `frontend/.env.example`)

| Variable | Descripción |
|---|---|
| `BACKEND_URL` | URL del backend; Next hace de proxy de `/api/v1` y `/uploads` |

## Scripts útiles

Backend (`cd backend`):

| Script | Qué hace |
|---|---|
| `npm run start:dev` | API con recarga en caliente |
| `npm run db:setup` | `migrate deploy` + seed |
| `npm run db:migrate` | crea/aplica migraciones en desarrollo |
| `npm run db:reset` | borra la BD, reaplica migraciones y seed |
| `npm run db:studio` | Prisma Studio |
| `npm test` | tests unitarios |
| `npm run test:e2e` | tests e2e (requiere la BD levantada y con seed) |
| `npm run lint` / `npm run typecheck` / `npm run build` | calidad y compilación |

Frontend (`cd frontend`): `npm run dev`, `npm run build`, `npm run lint`.

## Respaldo de la base de datos

Respaldo diario recomendado con `pg_dump` (por ejemplo con el Programador de tareas de Windows o cron):

```bash
# respaldo (formato custom, comprimido)
docker exec zoonosis-db pg_dump -U zoonosis -d zoonosis -Fc > backup_$(date +%F).dump

# restauración
docker exec -i zoonosis-db pg_restore -U zoonosis -d zoonosis --clean --if-exists < backup_AAAA-MM-DD.dump
```

En producción (Supabase/Neon) usar además los respaldos automáticos del proveedor.
