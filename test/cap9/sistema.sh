#!/bin/sh
# Levanta o detiene el sistema completo del Capítulo IX con las imágenes de producción.
#   sh test/cap9/sistema.sh up -d      → levanta backend, frontend y nginx (http://localhost:3000)
#   sh test/cap9/sistema.sh down       → los detiene
# Lee .env.test y se niega a seguir si DATABASE_URL no es la base de prueba.
set -eu
cd "$(dirname "$0")"
set -a
. ../../.env.test
set +a
case "$DATABASE_URL" in
  *:5433/zoonosis_test*) ;;
  *) echo "DATABASE_URL no apunta a la base de prueba (puerto 5433, zoonosis_test)"; exit 1 ;;
esac
# Dentro de Docker, la base de prueba se alcanza por host.docker.internal.
CAP9_DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed -e 's#@localhost:5433#@host.docker.internal:5433#' -e 's#@127\.0\.0\.1:5433#@host.docker.internal:5433#')
export CAP9_DATABASE_URL
exec docker compose -f docker-compose.cap9.yml "$@"
