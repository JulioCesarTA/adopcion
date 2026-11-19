#!/usr/bin/env bash
# Redespliega la aplicación en la instancia EC2 a partir de las imágenes de ECR.
#
# Uso, en la instancia:
#   sudo /opt/zoonosis/deploy/redeploy.sh
#
# Es el mismo camino que usará el workflow de CI/CD: iniciar sesión en ECR,
# descargar las imágenes nuevas y recrear los contenedores. Idempotente.
#
# OJO con sudo -E: preserva HOME, y entonces Docker busca las credenciales en
# $HOME/.docker/config.json del usuario original en lugar de /root/.docker.
# Por eso este script fija HOME explícitamente antes de cualquier `docker login`.
set -euo pipefail

APP_DIR=/opt/zoonosis
REGION=sa-east-1
REGISTRY=012875038716.dkr.ecr.sa-east-1.amazonaws.com

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: hay que ejecutarlo con sudo (Docker y /opt/zoonosis son de root)."
  exit 1
fi

# Fijar HOME de root pase lo que pase, para que `docker login` escriba y lea
# siempre el mismo archivo de credenciales.
export HOME=/root
export AWS_REGION="$REGION"

cd "$APP_DIR"
[[ -f .env ]] || { echo "ERROR: falta $APP_DIR/.env"; exit 1; }

# Elegir el override según si ya hay certificado emitido.
PUBLIC_HOST=$(grep -E '^PUBLIC_HOST=' .env | cut -d= -f2)
if docker run --rm -v zoonosis_certbot-conf:/etc/letsencrypt \
     --entrypoint test certbot/certbot -f "/etc/letsencrypt/live/$PUBLIC_HOST/fullchain.pem"; then
  OVERRIDE=docker-compose.ip-tls.yml
  echo "==> Certificado presente para $PUBLIC_HOST: se despliega con HTTPS"
else
  OVERRIDE=docker-compose.ec2.yml
  echo "==> Sin certificado todavía: se despliega solo con HTTP"
  echo "    (para emitirlo: ./deploy/init-letsencrypt-ip.sh)"
fi

echo "==> Iniciando sesión en ECR con el rol de la instancia"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

COMPOSE="docker compose -f docker-compose.prod.yml -f $OVERRIDE"

echo "==> Descargando imágenes"
$COMPOSE pull

echo "==> Recreando contenedores"
$COMPOSE up -d

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
    echo "ERROR: el API no respondió en 2 minutos. Revisar:"
    echo "  docker compose -f docker-compose.prod.yml -f $OVERRIDE logs --tail 50 backend"
    exit 1
  fi
done

if [[ -x deploy/cargar-datos.sh ]]; then
  ./deploy/cargar-datos.sh
fi

echo "==> Limpiando imágenes sin usar"
docker image prune -f >/dev/null

echo
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'NAMES|zoonosis-'
echo
echo "Listo. https://$PUBLIC_HOST"
