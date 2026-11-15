#!/usr/bin/env bash
# Emite el primer certificado de Let's Encrypt para una DIRECCIÓN IP.
#
# Let's Encrypt habilitó los certificados de IP en enero de 2026. Condiciones:
#   - Obligan al perfil `shortlived`: 160 h de validez (~6,6 días).
#   - Certbot necesita 5.4 o posterior para --ip-address con --webroot.
#   - Certbot solo OBTIENE el certificado; instalarlo en nginx es cosa nuestra
#     (lo hace la plantilla deploy/nginx/templates-ip-tls).
#
# Uso, desde el directorio del proyecto en la instancia:
#   ./deploy/init-letsencrypt-ip.sh                  # emisión real
#   STAGING=true ./deploy/init-letsencrypt-ip.sh     # prueba, sin gastar cuota
set -euo pipefail

cd "$(dirname "$0")/.."
[[ -f .env ]] || { echo "ERROR: falta .env"; exit 1; }
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${PUBLIC_HOST:?Falta PUBLIC_HOST en .env (la IP elástica)}"
: "${CERTBOT_EMAIL:?Falta CERTBOT_EMAIL en .env}"
STAGING="${STAGING:-false}"

COMPOSE="docker compose -f docker-compose.prod.yml -f docker-compose.ec2.yml"

echo "==> Verificando la versión de certbot (hace falta >= 5.4)"
VER=$(docker run --rm --entrypoint certbot certbot/certbot --version 2>&1 \
  | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
echo "    certbot $VER"
MAJOR=${VER%%.*}
REST=${VER#*.}
MINOR=${REST%%.*}
if (( MAJOR < 5 || (MAJOR == 5 && MINOR < 4) )); then
  echo "ERROR: certbot $VER no soporta --ip-address con --webroot. Se necesita 5.4+."
  exit 1
fi

echo "==> Levantando nginx en HTTP para responder el reto ACME"
$COMPOSE up -d nginx
sleep 3

echo "==> Comprobando que el puerto 80 llega a nginx desde fuera"
# Cualquier respuesta HTTP sirve: un 404 ya prueba que nginx atiende la ruta.
# Lo que descarta este chequeo es el caso grave: puerto cerrado o nginx caído.
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
  "http://$PUBLIC_HOST/.well-known/acme-challenge/sonda" || echo "000")
if [[ "$CODE" == "000" ]]; then
  echo "ERROR: http://$PUBLIC_HOST no responde (código $CODE)."
  echo "       Revisar el security group (puerto 80 abierto a 0.0.0.0/0) y que nginx esté arriba."
  exit 1
fi
echo "    OK: nginx responde en el puerto 80 (código $CODE)"

STAGING_ARG=""
if [[ "$STAGING" == "true" ]]; then
  echo "==> MODO PRUEBA (staging): el certificado NO será de confianza"
  STAGING_ARG="--staging"
fi

echo "==> Solicitando el certificado para $PUBLIC_HOST"
# shellcheck disable=SC2086
docker run --rm \
  -v zoonosis_certbot-conf:/etc/letsencrypt \
  -v zoonosis_certbot-www:/var/www/certbot \
  certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    --ip-address "$PUBLIC_HOST" \
    --preferred-profile shortlived \
    --email "$CERTBOT_EMAIL" \
    --agree-tos --no-eff-email \
    --non-interactive \
    $STAGING_ARG

echo "==> Certificado emitido. Cambiando nginx a HTTPS"
docker compose -f docker-compose.prod.yml -f docker-compose.ip-tls.yml up -d

cat <<FIN

===========================================================================
HTTPS activo en https://$PUBLIC_HOST

ATENCIÓN: el certificado vence en 160 horas (~6,6 días). El contenedor
certbot lo renueva solo cada 6 h, así que no hay que hacer nada mientras la
instancia siga encendida.

Si la instancia queda apagada más de 6 días, al volver hay que forzar:
  docker compose -f docker-compose.prod.yml -f docker-compose.ip-tls.yml \
    run --rm --entrypoint certbot certbot renew --force-renewal

Ver cuándo vence:
  docker run --rm -v zoonosis_certbot-conf:/etc/letsencrypt \
    certbot/certbot certificates
===========================================================================
FIN
