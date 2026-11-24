#!/usr/bin/env bash
# Despliegue rápido: construye las imágenes EN la instancia y recrea los
# contenedores. No pasa por ECR ni espera a las pruebas del CI.
#
# Uso, en la instancia:
#   sudo /opt/zoonosis/deploy/build-deploy.sh
#
# Docker reutiliza las capas en caché: si solo cambió el frontend, el backend
# se "construye" en segundos, y al revés.
set -euo pipefail

APP_DIR=/opt/zoonosis
BRANCH=${BRANCH:-main}

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: hay que ejecutarlo con sudo."
  exit 1
fi
export HOME=/root

cd "$APP_DIR"
[[ -f .env ]] || { echo "ERROR: falta $APP_DIR/.env"; exit 1; }

echo "==> Actualizando el código ($BRANCH)"
git fetch --all --quiet
git reset --hard "origin/$BRANCH" --quiet
git log --oneline -1

# Imágenes locales en lugar de las de ECR.
sed -i 's|^BACKEND_IMAGE=.*|BACKEND_IMAGE=zoonosis-backend:local|' .env
sed -i 's|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=zoonosis-frontend:local|' .env

PUBLIC_HOST=$(grep -E '^PUBLIC_HOST=' .env | cut -d= -f2)
if docker run --rm -v zoonosis_certbot-conf:/etc/letsencrypt \
     --entrypoint test certbot/certbot -f "/etc/letsencrypt/live/$PUBLIC_HOST/fullchain.pem"; then
  OVERRIDE=docker-compose.ip-tls.yml
else
  OVERRIDE=docker-compose.ec2.yml
fi
COMPOSE="docker compose -f docker-compose.prod.yml -f $OVERRIDE -f docker-compose.local-build.yml"

echo "==> Construyendo imágenes en la instancia"
$COMPOSE build backend frontend

echo "==> Recreando contenedores"
$COMPOSE up -d

# Los contenedores recreados cambian de IP y nginx guarda la anterior:
# sin recargarlo responde 502.
docker exec zoonosis-nginx nginx -s reload

echo "==> Esperando que el API responda"
for i in $(seq 1 24); do
  sleep 5
  if curl -fsS --max-time 5 http://127.0.0.1/api/v1/health >/dev/null 2>&1 \
     || curl -fsSk --max-time 5 https://127.0.0.1/api/v1/health >/dev/null 2>&1; then
    echo "    OK, el API responde"
    break
  fi
  echo "    intento $i..."
  if [[ $i -eq 24 ]]; then
    echo "ERROR: el API no respondió en 2 minutos."
    $COMPOSE logs --tail 50 backend
    exit 1
  fi
done

if [[ -x deploy/cargar-datos.sh ]]; then
  ./deploy/cargar-datos.sh
fi

echo "==> Limpiando imágenes y caché sin usar"
docker image prune -f >/dev/null
docker builder prune -f --keep-storage 3GB >/dev/null 2>&1 || true

docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'NAMES|zoonosis-'
echo "Listo. https://$PUBLIC_HOST"
