# Despliegue en AWS EC2

Guía completa para poner el sistema en producción: una instancia EC2 con Docker,
nginx como proxy inverso con HTTPS de Let's Encrypt, PostgreSQL en contenedor
(o RDS) y las fotos de los animales en un bucket de S3.

```
                    Internet
                        │  443 / 80
                        ▼
        ┌───────────────────────────────┐
        │  EC2 (Ubuntu 24.04)           │
        │  ┌─────────────────────────┐  │
        │  │ nginx  :80 :443         │  │  ← Let's Encrypt (certbot)
        │  └───┬──────────────┬──────┘  │
        │      │ /            │ /api/   │
        │      ▼              ▼         │
        │  ┌────────┐   ┌──────────┐    │
        │  │ Next   │   │ NestJS   │    │
        │  │ :3000  │   │ :4000    │    │
        │  └────────┘   └────┬─────┘    │
        │                    │          │
        │               ┌────▼─────┐    │
        │               │ Postgres │    │
        │               │  :5432   │    │
        │               └──────────┘    │
        └────────────────────┬──────────┘
                             │ rol IAM
                             ▼
                      ┌─────────────┐
                      │  S3 bucket  │  fotos de animales
                      └─────────────┘
```

---

## 1. Recursos de AWS que hay que crear

| Recurso | Configuración |
|---|---|
| **Instancia EC2** | Ubuntu Server 24.04 LTS, tipo `t3.small` recomendado (`t3.micro` funciona con el swap que crea el script de setup). Disco 20 GB gp3. |
| **IP elástica** | Asignada a la instancia, para que el DNS no se rompa al reiniciar. |
| **Security Group** | Entrada: `22` (solo tu IP), `80` (0.0.0.0/0), `443` (0.0.0.0/0). Salida: todo. **No abrir el 5432.** |
| **Bucket S3** | Nombre único, por ejemplo `zoonosis-scz-fotos`, en la misma región que la EC2. |
| **Rol IAM** | Para la instancia, con la política de [`deploy/aws/iam-policy-ec2.json`](deploy/aws/iam-policy-ec2.json). |
| **Registro DNS** | Un registro `A` del dominio apuntando a la IP elástica. |

### Configurar el bucket S3

1. **S3 → Create bucket.** Nombre = el de `S3_BUCKET`, región = la de la EC2.
2. **Permissions → Block public access → Edit:** desmarcar *Block all public access*
   (el navegador necesita leer las fotos directamente).
3. **Permissions → Bucket policy:** pegar [`deploy/aws/s3-bucket-policy.json`](deploy/aws/s3-bucket-policy.json)
   reemplazando `NOMBRE-DEL-BUCKET`. Solo da lectura del prefijo `animals/`.
4. **Permissions → CORS** (necesario si algún día se suben archivos desde el navegador):

   ```json
   [{ "AllowedHeaders": ["*"], "AllowedMethods": ["GET"], "AllowedOrigins": ["https://TU-DOMINIO"], "MaxAgeSeconds": 3000 }]
   ```

### Configurar el rol IAM (así no hay claves en el servidor)

1. **IAM → Policies → Create policy → JSON:** pegar `deploy/aws/iam-policy-ec2.json`
   (sin el bloque `_comentario`), reemplazando `NOMBRE-DEL-BUCKET`. Nombre: `zoonosis-s3-fotos`.
2. **IAM → Roles → Create role → AWS service → EC2:** adjuntar esa política. Nombre: `zoonosis-ec2-role`.
3. **EC2 → la instancia → Actions → Security → Modify IAM role:** elegir el rol.

Con el rol puesto, `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` se dejan **vacías**
en `.env`: el SDK obtiene credenciales temporales del metadata de la instancia.
Es más seguro que guardar claves de larga duración en el servidor.

---

## 2. Preparar la instancia

Conectarse por SSH y ejecutar:

```bash
git clone https://github.com/USUARIO/REPO.git ~/zoonosis
cd ~/zoonosis
./deploy/ec2-setup.sh
```

El script instala Docker y el plugin compose, configura el cortafuegos `ufw`
(solo 22, 80 y 443), crea un swap de 2 GB y habilita Docker al arranque.
Al terminar hay que **cerrar la sesión SSH y volver a entrar** para que aplique
el grupo `docker`.

---

## 3. Variables de entorno

```bash
cd ~/zoonosis
cp .env.production.example .env
nano .env
```

Lo que hay que completar como mínimo:

| Variable | Valor |
|---|---|
| `DOMAIN` | El dominio que apunta a la instancia |
| `CERTBOT_EMAIL` | Correo para avisos de vencimiento del certificado |
| `POSTGRES_PASSWORD` y `DATABASE_URL` | La misma contraseña en los dos |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Dos valores distintos de `openssl rand -base64 48` |
| `S3_BUCKET`, `AWS_REGION` | El bucket y su región |
| `SMTP_*`, `MAIL_FROM`, `CONTACT_TO` | Credenciales de Resend o Brevo |
| `ANTHROPIC_API_KEY` | Clave de console.anthropic.com |
| `INSTITUTION_*`, `SOCIAL_*` | Datos reales de la institución |

> `.env` está en `.gitignore`: vive solo en la instancia y nunca se sube al repositorio.

---

## 4. Emitir el certificado HTTPS y arrancar

Comprobar primero que el DNS ya resuelve:

```bash
dig +short TU-DOMINIO     # debe devolver la IP elástica
```

Y después:

```bash
./deploy/init-letsencrypt.sh
```

El script hace lo siguiente, en este orden:

1. Descarga los parámetros TLS recomendados y genera `ssl-dhparams.pem`.
2. Crea un certificado autofirmado temporal, porque nginx no arranca sin un
   archivo de certificado (el problema del huevo y la gallina).
3. Levanta backend, frontend y nginx, que ya puede responder el reto ACME en el puerto 80.
4. Borra el temporal y pide el certificado real a Let's Encrypt por el método *webroot*.
5. Recarga nginx y arranca el contenedor de renovación automática.

> **Para probar sin gastar el límite** de Let's Encrypt (5 certificados por
> dominio por semana), poner `CERTBOT_STAGING=true` en `.env`. El certificado
> no será de confianza, pero valida que todo el circuito funcione. Después
> poner `false` y volver a ejecutar el script.

La renovación es automática: el contenedor `zoonosis-certbot` intenta renovar
cada 12 horas y nginx recarga su configuración cada 6 horas para tomar el
certificado nuevo.

---

## 5. Crear los usuarios iniciales (solo la primera vez)

La base arranca vacía, así que hay que ejecutar el seed una vez:

```bash
sed -i 's/^RUN_SEED=.*/RUN_SEED=true/' .env
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
docker compose -f docker-compose.prod.yml logs -f backend     # esperar "Iniciando"
sed -i 's/^RUN_SEED=.*/RUN_SEED=false/' .env
```

Esto crea los cuatro usuarios de personal y el catálogo de vacunas.

> **Importante:** entrar con `admin@zoonosis.test` / `Zoo12345` y **cambiar esa
> contraseña de inmediato**, además de crear las cuentas reales y desactivar las
> de prueba. El seed también carga animales de demostración; conviene revisarlos
> antes de usar el sistema en serio.

Verificar que todo responde:

```bash
curl https://TU-DOMINIO/api/v1/health
# {"status":"ok","uptime":42,"timestamp":"..."}
```

---

## 6. CI/CD con GitHub Actions

Hay dos flujos de trabajo:

| Archivo | Cuándo corre | Qué hace |
|---|---|---|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | push y pull request a `main` o `develop` | Lint, tipos, compilación, 57 pruebas unitarias y 23 e2e contra un PostgreSQL de servicio, y construye las dos imágenes Docker sin publicarlas |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | cuando el CI termina bien en `main`, o a mano | Publica las imágenes en GHCR, entra por SSH a la EC2, fija las imágenes de esa versión en `.env`, hace `docker compose up -d` y verifica el endpoint de salud |

### Secretos que hay que crear en GitHub

**Settings → Secrets and variables → Actions → New repository secret:**

| Secreto | Contenido |
|---|---|
| `EC2_HOST` | IP elástica o dominio de la instancia |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contenido completo de la clave privada `.pem` (incluyendo las líneas `BEGIN`/`END`) |
| `EC2_PORT` | `22` (opcional) |
| `EC2_APP_DIR` | `/home/ubuntu/zoonosis` |
| `DOMAIN` | El dominio, para la verificación final |

`GITHUB_TOKEN` lo provee GitHub automáticamente y sirve para publicar y
descargar las imágenes de GHCR; no hay que crearlo.

### Flujo de trabajo del equipo

```
rama de trabajo → pull request → CI verifica → merge a main → CI → deploy automático
```

Las migraciones de base de datos se aplican solas: el `docker-entrypoint.sh`
del backend ejecuta `prisma migrate deploy` antes de arrancar, y es idempotente.

---

## 7. Operación del día a día

```bash
cd ~/zoonosis

# Estado de los contenedores
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend

# Desplegar a mano (sin CI/CD)
git pull && docker compose -f docker-compose.prod.yml up -d --build

# Estado del certificado
docker compose -f docker-compose.prod.yml run --rm certbot certificates
```

### Respaldo de la base de datos

```bash
# Respaldo
docker exec zoonosis-db pg_dump -U zoonosis -d zoonosis -Fc > backup_$(date +%F).dump

# Restauración
docker exec -i zoonosis-db pg_restore -U zoonosis -d zoonosis --clean --if-exists < backup_AAAA-MM-DD.dump
```

Automatizarlo con cron y subirlo a S3:

```bash
crontab -e
# Respaldo diario a las 3:00 y subida al bucket
0 3 * * * docker exec zoonosis-db pg_dump -U zoonosis -d zoonosis -Fc > /tmp/db.dump && aws s3 cp /tmp/db.dump s3://zoonosis-scz-fotos/backups/db_$(date +\%F).dump && rm /tmp/db.dump
```

> El rol IAM de la instancia necesita permiso `s3:PutObject` sobre
> `backups/*` para que esto funcione; la política de ejemplo solo cubre `animals/*`.

---

## 8. Cambiar al almacenamiento local o a RDS

**Volver a guardar las fotos en el disco del servidor** (sin S3): poner
`STORAGE_DRIVER=local` en `.env` y reiniciar el backend. Las fotos van al
volumen `uploads` y nginx las sirve en `/uploads/`. Las fotos que ya estaban
en S3 siguen funcionando porque su URL quedó guardada completa en la base.

**Usar Amazon RDS en lugar del contenedor de PostgreSQL:**

1. Crear la instancia RDS PostgreSQL 16 en la misma VPC, sin acceso público.
2. En su Security Group, permitir el puerto 5432 solo desde el Security Group de la EC2.
3. Comentar el servicio `db` completo en `docker-compose.prod.yml`.
4. Apuntar `DATABASE_URL` al endpoint con `&sslmode=require`.

---

## 9. Lo que queda pendiente

| Pendiente | Por qué importa |
|---|---|
| Claves reales de AWS, SMTP y Anthropic | Sin ellas: las fotos no suben a S3, el formulario de contacto solo guarda en base y el asistente responde 503 |
| Dominio registrado y DNS apuntando a la EC2 | Let's Encrypt no emite certificados para direcciones IP |
| Revisión legal de `/terminos` y `/privacidad` | Los textos actuales son un modelo, no un documento legal válido |
| Cambiar las contraseñas del seed | `Zoo12345` es pública: está en el repositorio |
| Respaldo automatizado | El procedimiento está documentado pero no programado |
| Monitoreo y alertas | No hay CloudWatch, Sentry ni aviso de caída configurado |
| Pruebas de carga | No se midió cuántos usuarios concurrentes soporta |
