#!/usr/bin/env bash
# Emite el certificado TLS de Let's Encrypt la primera vez.
#
# Ejecutar UNA vez en la instancia EC2, desde la raíz del proyecto:
#   ./deploy/init-letsencrypt.sh
#
# Requisitos previos:
#   - El dominio DOMAIN ya apunta (registro A) a la IP pública de la EC2.
#   - Los puertos 80 y 443 abiertos en el Security Group.
#   - El archivo .env creado a partir de .env.production.example.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

if [[ ! -f .env ]]; then
  echo "ERROR: falta el archivo .env (cópialo de .env.production.example)" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

: "${DOMAIN:?Define DOMAIN en .env}"
: "${CERTBOT_EMAIL:?Define CERTBOT_EMAIL en .env}"

STAGING="${CERTBOT_STAGING:-false}"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "==> Dominio: $DOMAIN   Correo: $CERTBOT_EMAIL   Staging: $STAGING"

# ---------------------------------------------------------------------------
# 1. Parámetros TLS recomendados por Certbot (los incluye la config de nginx).
# ---------------------------------------------------------------------------
echo "==> Preparando parámetros TLS..."
$COMPOSE run --rm --entrypoint "/bin/sh -c" certbot "
  set -e
  if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
    echo 'Descargando options-ssl-nginx.conf...'
    wget -qO /etc/letsencrypt/options-ssl-nginx.conf \
      https://raw.githubusercontent.com/certbot/certbot/main/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf
  fi
  if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
    echo 'Generando ssl-dhparams.pem (puede tardar un minuto)...'
    openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
  fi
"

# ---------------------------------------------------------------------------
# 2. Certificado temporal autofirmado: nginx no arranca sin un archivo de cert.
# ---------------------------------------------------------------------------
echo "==> Creando certificado temporal para que nginx pueda arrancar..."
$COMPOSE run --rm --entrypoint "/bin/sh -c" certbot "
  set -e
  mkdir -p '$CERT_PATH'
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '$CERT_PATH/privkey.pem' \
    -out    '$CERT_PATH/fullchain.pem' \
    -subj '/CN=localhost' 2>/dev/null
  cp '$CERT_PATH/fullchain.pem' '$CERT_PATH/chain.pem'
"

# ---------------------------------------------------------------------------
# 3. Levantar la aplicación y nginx (ya puede servir el reto ACME por :80).
# ---------------------------------------------------------------------------
echo "==> Levantando los servicios..."
$COMPOSE up -d --build backend frontend nginx
sleep 8

# ---------------------------------------------------------------------------
# 4. Borrar el temporal y pedir el certificado real por el método webroot.
# ---------------------------------------------------------------------------
echo "==> Solicitando el certificado real a Let's Encrypt..."
$COMPOSE run --rm --entrypoint "/bin/sh -c" certbot "rm -rf '$CERT_PATH' /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

EXTRA_ARGS=()
if [[ "$STAGING" == "true" ]]; then
  EXTRA_ARGS+=(--staging)
  echo "    (modo staging: el certificado NO será de confianza, sirve para probar)"
fi

# Incluir www.DOMINIO solo si existe el registro DNS; si no, certbot falla entero.
if [[ "${CERTBOT_INCLUDE_WWW:-false}" == "true" ]]; then
  EXTRA_ARGS+=(-d "www.$DOMAIN")
  echo "    (incluyendo www.$DOMAIN)"
fi

$COMPOSE run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email \
  --non-interactive \
  -d "$DOMAIN" "${EXTRA_ARGS[@]}"

# ---------------------------------------------------------------------------
# 5. Recargar nginx con el certificado definitivo y arrancar la renovación.
# ---------------------------------------------------------------------------
echo "==> Recargando nginx..."
$COMPOSE exec nginx nginx -s reload
$COMPOSE up -d

echo ""
echo "Listo. Comprueba: https://$DOMAIN/api/v1/health"
echo "La renovación automática queda corriendo en el contenedor zoonosis-certbot."
