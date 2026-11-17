# Pruebas del sistema completo (Capítulo IX)

Todo se ejecuta en local, con la base de prueba (`.env.test`, puerto 5433, `zoonosis_test`).
Nunca contra el servidor de AWS. Los resultados se arman en `docs/pruebas-cap9/datos-cap9.json`.

## Orden de ejecución

```bash
# 0. Herramientas de esta carpeta
cd test/cap9 && npm ci && cd ../..

# 1. Base de prueba y sistema con las imágenes de producción (http://localhost:3000)
docker start zoonosis-db-test
docker build -t zoonosis-backend:cap9 ./backend
docker build -t zoonosis-frontend:cap9 ./frontend
sh test/cap9/sistema.sh up -d

# 2. Unitarias con cobertura, complejidad e integración (ver «comando» en datos-cap9.json)
cd backend && set -a && . ../.env.test && set +a
npx jest --coverage
npm run db:setup && npm run test:e2e
cd ..

# 3. Regresión de caja negra (13 pruebas de los sprints, cada una con su seed)
sh test/cap9/ejecutar-sprints.sh

# 4. Sistema, XSS y accesibilidad (después del seed del Sprint 3)
cd test/cap9 && npx playwright test && cd ../..

# 5. Seguridad SEG-01 a SEG-19 (Supertest)
cd backend && npx jest --config ../test/cap9/jest-seguridad.config.js --runInBand && cd ..

# 6. Rendimiento y seguridad con herramientas externas
node test/cap9/lighthouse.js
sh test/cap9/ejecutar-k6.sh
sh test/cap9/zap.sh
node test/cap9/reproducir-500.js

# 7. Capturas, limpieza de la evidencia, datos-cap9.json y validación
node test/cap9/capturar.js
node test/cap9/limpiar-evidencia.js
node test/cap9/generar-datos.js
node test/cap9/validar.js

# 8. Apagar
sh test/cap9/sistema.sh down && docker stop zoonosis-db-test
```

## Notas

- El inicio de sesión admite 10 intentos por minuto por IP: `ejecutar-sprints.sh` espera 65 s
  antes de cada sprint.
- `capturar.js` enmascara la contraseña de prueba en el informe HTML de Playwright, que guarda
  el valor de los pasos «fill».
- `limpiar-evidencia.js` quita el token que k6 guarda en `setup_data`, el código fuente que ESLint
  copia en su salida y las rutas absolutas del equipo.
