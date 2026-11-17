#!/bin/sh
# Ejecuta los tres escenarios de carga (10, 25 y 50 usuarios virtuales) contra el backend local
# levantado con test/cap9/sistema.sh, y registra el uso de CPU y memoria de cada contenedor con
# docker stats mientras dura cada escenario.
#   sh test/cap9/ejecutar-k6.sh
set -u
cd "$(dirname "$0")"
CAP9=$(pwd)
REPORTES="$CAP9/../../docs/pruebas-cap9/reportes"
EV="$CAP9/evidencia/k6"
mkdir -p "$REPORTES" "$EV"
set -a
. ../../.env.test
set +a
win() { cygpath -w "$1" 2>/dev/null || echo "$1"; }

for N in 10 25 50; do
  echo "=== Escenario de $N usuarios virtuales"
  : > "$EV/stats-$N.jsonl"
  rm -f "$EV/.parar"
  (
    while [ ! -f "$EV/.parar" ]; do
      docker stats --no-stream --format '{{json .}}' |
        grep -E 'zoonosis-cap9|zoonosis-db-test|k6-cap9' >> "$EV/stats-$N.jsonl"
    done
  ) &
  MUESTREO=$!
  MSYS_NO_PATHCONV=1 docker run --rm --name "k6-cap9-$N" \
    --network zoonosis-cap9_default \
    -e USUARIOS="$N" -e K6_EMAIL=adopciones.prueba@zoonosis.test -e K6_PASSWORD="$SPRINT1_PASSWORD" \
    -v "$(win "$REPORTES"):/out" -v "$(win "$CAP9/k6/carga.js"):/carga.js:ro" \
    grafana/k6:latest run /carga.js > "$EV/salida-$N.ansi" 2>&1
  echo "k6=$?"
  touch "$EV/.parar"
  wait "$MUESTREO"
  rm -f "$EV/.parar"
  echo "muestras de docker stats: $(wc -l < "$EV/stats-$N.jsonl")"
  # Pausa para que el sistema vuelva al reposo antes del escenario siguiente.
  sleep 30
done
