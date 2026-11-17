#!/bin/sh
# OWASP ZAP (imagen oficial ghcr.io/zaproxy/zaproxy:stable) contra el sistema local:
#   1. zap-baseline.py: escaneo pasivo del frontend a través de nginx (http://nginx).
#   2. zap-api-scan.py: escaneo activo de la API con la especificación OpenAPI de Swagger,
#      autenticado con un usuario de Gestión, sobre la instancia backend-zap (misma imagen y base;
#      token de 1 hora para que no venza durante el escaneo). Duración máxima: 30 minutos.
# Nunca se ejecuta contra el servidor de AWS.
#   sh test/cap9/zap.sh
set -u
cd "$(dirname "$0")"
CAP9=$(pwd)
EV="$CAP9/evidencia/zap"
REPORTES="$CAP9/../../docs/pruebas-cap9/reportes"
mkdir -p "$EV" "$REPORTES"
win() { cygpath -w "$1" 2>/dev/null || echo "$1"; }
set -a
. ../../.env.test
set +a
IMAGEN=ghcr.io/zaproxy/zaproxy:stable

echo "=== ZAP baseline del frontend"
MSYS_NO_PATHCONV=1 docker run --rm --name zap-frontend --network zoonosis-cap9_default \
  -v "$(win "$EV"):/zap/wrk:rw" "$IMAGEN" \
  zap-baseline.py -t http://nginx -r zap-frontend.html -J zap-frontend.json -I \
  > "$EV/salida-frontend.txt" 2>&1
echo "baseline=$?"

echo "=== Instancia backend-zap"
sh ./sistema.sh --profile zap up -d backend-zap
for i in $(seq 1 60); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4100/api/v1/health)" = "200" ] && break
  sleep 2
done
TOKEN=$(curl -s -X POST http://localhost:4100/api/v1/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"adopciones.prueba@zoonosis.test\",\"password\":\"$SPRINT1_PASSWORD\"}" |
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).accessToken||''))")
[ -n "$TOKEN" ] || { echo "No se obtuvo el token"; exit 1; }

echo "=== ZAP API scan (OpenAPI)"
MSYS_NO_PATHCONV=1 docker run --rm --name zap-api --network zoonosis-cap9_default \
  -e ZAP_AUTH_HEADER_VALUE="Bearer $TOKEN" \
  -v "$(win "$EV"):/zap/wrk:rw" "$IMAGEN" \
  zap-api-scan.py -t http://backend-zap:4000/api/docs-json -f openapi \
  -r zap-api.html -J zap-api.json -I \
  -z "-config scanner.maxScanDurationInMins=30 -config scanner.maxRuleDurationInMins=3" \
  > "$EV/salida-api.txt" 2>&1
echo "api=$?"
unset TOKEN

sh ./sistema.sh --profile zap stop backend-zap
sh ./sistema.sh --profile zap rm -f backend-zap

cp "$EV/zap-frontend.html" "$EV/zap-api.html" "$REPORTES/"
echo "listo"
