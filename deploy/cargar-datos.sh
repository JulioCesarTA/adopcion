#!/usr/bin/env bash
# Carga única de los datos iniciales de producción y de las fotos de los animales.
#
# Lo llama redeploy.sh después de que el API respondió (las migraciones ya se aplicaron).
# Es idempotente:
#   - el SQL solo se aplica si todavía no existe el animal ZOO-2026-0013;
#   - cada foto solo se sube si el animal todavía no tiene una.
set -euo pipefail

APP_DIR=/opt/zoonosis
DATOS="$APP_DIR/deploy/datos"
cd "$APP_DIR"

env_val() { grep -E "^$1=" .env | cut -d= -f2-; }
DB_USER=$(env_val POSTGRES_USER)
DB_NAME=$(env_val POSTGRES_DB)
BUCKET=$(env_val S3_BUCKET)
REGION=$(env_val AWS_REGION)
PSQL=(docker exec -i zoonosis-db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -qtA)

echo "==> Datos iniciales"
if [[ "$("${PSQL[@]}" -c "select count(*) from animals where code='ZOO-2026-0013'")" == "0" ]]; then
  "${PSQL[@]}" < "$DATOS/adopet-datos.sql"
  echo "    cargados"
else
  echo "    ya estaban cargados: se omiten"
fi

echo "==> Fotos de los animales"
[[ -n "$BUCKET" ]] || { echo "    sin S3_BUCKET: se omiten"; exit 0; }
BASE="https://$BUCKET.s3.$REGION.amazonaws.com"
for foto in "$DATOS"/fotos/ZOO-*.jpg; do
  [[ -f "$foto" ]] || continue
  code=$(basename "$foto" .jpg)
  fila=$("${PSQL[@]}" -c "select id || '|' || coalesce(photo_url,'') from animals where code='$code'")
  [[ -n "$fila" ]] || { echo "    $code no existe: se omite"; continue; }
  id=${fila%%|*}
  actual=${fila#*|}
  [[ -z "$actual" ]] || continue
  key="animals/$id-$(cat /proc/sys/kernel/random/uuid).jpg"
  aws s3 cp "$foto" "s3://$BUCKET/$key" --region "$REGION" --only-show-errors \
    --content-type image/jpeg --cache-control 'public, max-age=31536000, immutable'
  "${PSQL[@]}" -c "update animals set photo_url='$BASE/$key' where id='$id'"
  echo "    $code subida"
done
