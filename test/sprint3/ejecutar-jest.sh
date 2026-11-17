#!/usr/bin/env sh
# Ejecuta la caja blanca y las pruebas unitarias del Sprint 3 con los comandos de la guía
# y guarda los informes en docs/pruebas-sprint3/. No usa base de datos ni la API de Anthropic.
# Uso (desde la raíz del repositorio):  sh test/sprint3/ejecutar-jest.sh
set -eu
cd "$(dirname "$0")/../../backend"
D=../docs/pruebas-sprint3
U=$D/unitarias
mkdir -p "$U/salidas" "$U/capturas"

# Caja blanca
npx jest sprint3.spec -t "CB-HU" --json --outputFile=$D/caja-blanca-resultado.json > /dev/null 2>&1 || true

# Pruebas unitarias
npx jest sprint3.unit.spec -t "PU-HU" --json --outputFile=$U/jest-resultado.json > /dev/null 2>&1 || true

# Cobertura (rutas relativas al rootDir de Jest, que es backend/src)
rm -rf $U/cobertura
npx jest sprint3.unit.spec -t "PU-HU" --coverage \
  --collectCoverageFrom=modules/dashboard/dashboard.service.ts \
  --collectCoverageFrom=modules/kpis/kpis.service.ts \
  --collectCoverageFrom=modules/chat/chat-prompt.ts \
  --collectCoverageFrom=modules/chat/dto/chat.dto.ts \
  --collectCoverageFrom=modules/adoptions/adoptions.service.ts \
  --collectCoverageFrom=modules/adoptions/dto/adoptions.dto.ts \
  --collectCoverageFrom=modules/animals/animals.service.ts \
  --collectCoverageFrom=common/guards/roles.guard.ts \
  --coverageReporters=text --coverageReporters=json-summary --coverageReporters=html \
  --coverageDirectory=../../docs/pruebas-sprint3/unitarias/cobertura \
  > $U/salidas/cobertura-texto.txt 2>&1 || true

# Salidas reales de la terminal para las capturas
for h in 7 9 12; do
  FORCE_COLOR=1 npx jest sprint3.unit.spec -t "PU-HU$h-" --verbose > $U/salidas/PU-HU$h.txt 2>&1 || true
done
FORCE_COLOR=1 npx jest sprint3.unit.spec -t "PU-HU" > $U/salidas/PU-resumen.txt 2>&1 || true

cd ..
node test/sprint3/limpiar-rutas.js
node docs/pruebas-sprint3/unitarias/capturar.js
