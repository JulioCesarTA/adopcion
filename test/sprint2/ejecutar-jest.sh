#!/usr/bin/env sh
# Ejecuta la caja blanca y las pruebas unitarias del Sprint 2 con los comandos de la guía
# y guarda los informes en docs/pruebas-sprint2/. No usa base de datos.
# Uso (desde la raíz del repositorio):  sh test/sprint2/ejecutar-jest.sh
set -eu
cd "$(dirname "$0")/../../backend"
D=../docs/pruebas-sprint2
U=$D/unitarias
mkdir -p "$U/salidas" "$U/capturas"

# Caja blanca
npx jest sprint2.spec -t "CB-HU" --json --outputFile=$D/caja-blanca-resultado.json > /dev/null 2>&1 || true

# Pruebas unitarias
npx jest sprint2.unit.spec -t "PU-HU" --json --outputFile=$U/jest-resultado.json > /dev/null 2>&1 || true

# Cobertura (rutas relativas al rootDir de Jest, que es backend/src)
npx jest sprint2.unit.spec -t "PU-HU" --coverage \
  --collectCoverageFrom=modules/adopters/adopters.service.ts \
  --collectCoverageFrom=modules/adopters/dto/adopters.dto.ts \
  --collectCoverageFrom=modules/adoptions/adoptions.service.ts \
  --collectCoverageFrom=modules/adoptions/dto/adoptions.dto.ts \
  --collectCoverageFrom=modules/adoptions/request-status.ts \
  --collectCoverageFrom=modules/recommendation/engine.ts \
  --collectCoverageFrom=modules/recommendation/recommendation.service.ts \
  --collectCoverageFrom=modules/recommendation/ml/random-forest.ts \
  --collectCoverageFrom=modules/clinical/clinical.service.ts \
  --collectCoverageFrom=modules/clinical/dto/clinical.dto.ts \
  --collectCoverageFrom=modules/animals/animal-status.ts \
  --collectCoverageFrom=common/guards/roles.guard.ts \
  --coverageReporters=text --coverageReporters=json-summary --coverageReporters=html \
  --coverageDirectory=../../docs/pruebas-sprint2/unitarias/cobertura \
  > $U/salidas/cobertura-texto.txt 2>&1 || true

# Salidas reales de la terminal para las capturas
for h in 5 6 10 11; do
  FORCE_COLOR=1 npx jest sprint2.unit.spec -t "PU-HU$h-" --verbose > $U/salidas/PU-HU$h.txt 2>&1 || true
done
FORCE_COLOR=1 npx jest sprint2.unit.spec -t "PU-HU" > $U/salidas/PU-resumen.txt 2>&1 || true

cd ..
node test/sprint2/limpiar-rutas.js
node docs/pruebas-sprint2/unitarias/capturar.js
