#!/bin/sh
# Aplica las migraciones pendientes antes de arrancar el API.
# `migrate deploy` es idempotente: si no hay nada pendiente, no hace nada.
set -e

echo "[entrypoint] Aplicando migraciones de base de datos..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] RUN_SEED=true — ejecutando seed..."
  npx prisma db seed || echo "[entrypoint] El seed falló o ya se había aplicado; se continúa."
fi

echo "[entrypoint] Iniciando: $*"
exec "$@"
