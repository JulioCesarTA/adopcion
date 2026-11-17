#!/bin/sh
# Regresión de caja negra: vuelve a ejecutar las 13 pruebas de Playwright de los sprints 1, 2 y 3
# contra el sistema levantado con test/cap9/sistema.sh (http://localhost:3000).
# Cada sprint se ejecuta con su propio seed, igual que cuando se hizo la prueba original.
#
# Las pruebas de los sprints guardan capturas en docs/pruebas-sprintN/capturas y evidencia en
# test/sprintN/evidencia. Esos archivos están versionados y no se deben cambiar: al terminar, se
# restauran desde git y lo nuevo queda solo en test/cap9/evidencia/playwright/.
set -u
cd "$(dirname "$0")/../.."
RAIZ=$(pwd)
OUT="$RAIZ/test/cap9/evidencia/playwright"
mkdir -p "$OUT"
OUTW=$(cygpath -m "$OUT" 2>/dev/null || echo "$OUT")

set -a
. ./.env.test
set +a
case "$DATABASE_URL" in
  *:5433/zoonosis_test*) ;;
  *) echo "DATABASE_URL no apunta a la base de prueba"; exit 1 ;;
esac

# El inicio de sesión admite 10 intentos por minuto por IP. Los sprints se ejecutaron en su momento
# por separado; si se ejecutan seguidos desde la misma máquina, el undécimo inicio de sesión dentro
# del mismo minuto recibe 429. Por eso se espera 65 s antes de cada sprint.
SPRINTS=${*:-1 2 3}
for s in $SPRINTS; do
  echo "=== Sprint $s: espera de 65 s para que se renueve el límite de inicio de sesión"
  sleep 65
  echo "=== Sprint $s: seed"
  (cd backend && npx tsx "../test/sprint$s/seed-sprint$s.ts") > "$OUT/seed-sprint$s.log" 2>&1
  echo "seed=$?"
  echo "=== Sprint $s: Playwright"
  (
    cd "test/sprint$s" &&
      FORCE_COLOR=1 \
      PLAYWRIGHT_JSON_OUTPUT_FILE="$OUTW/sprint$s.json" \
      PLAYWRIGHT_BLOB_OUTPUT_FILE="$OUTW/blob/sprint$s.zip" \
      npx playwright test --reporter=list,json,blob
  ) > "$OUT/salida-sprint$s.ansi" 2>&1
  echo "playwright=$?"
  # Copia lo que observaron las pruebas en esta ejecución, antes de restaurar los originales.
  mkdir -p "$OUT/observado-sprint$s"
  cp -r "test/sprint$s/evidencia/." "$OUT/observado-sprint$s/" 2>/dev/null || true
done

# Restaurar lo versionado que las pruebas de los sprints sobrescriben.
git checkout -- docs/pruebas-sprint1/capturas docs/pruebas-sprint2/capturas docs/pruebas-sprint3/capturas \
  test/sprint1/evidencia test/sprint2/evidencia test/sprint3/evidencia
echo "restaurado=$?"
