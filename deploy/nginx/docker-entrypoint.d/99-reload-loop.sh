#!/bin/sh
# El entrypoint de la imagen nginx ejecuta todo lo que haya en /docker-entrypoint.d/
# antes de arrancar nginx. Dejamos un bucle en segundo plano que recarga la
# configuración cada 6 h, para que tome los certificados que renueva certbot
# (certbot corre en otro contenedor y no puede señalizar a este).
set -e
(
  while :; do
    sleep 6h
    nginx -s reload 2>/dev/null || true
  done
) &
echo "[nginx] bucle de recarga de certificados activo (cada 6 h)"
