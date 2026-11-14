#!/usr/bin/env bash
# Prepara una instancia EC2 recién creada (Ubuntu 24.04 LTS) para el proyecto.
#
# Uso, conectado por SSH a la instancia:
#   curl -fsSL https://raw.githubusercontent.com/USUARIO/REPO/main/deploy/ec2-setup.sh | bash
# o, si ya clonaste el repositorio:
#   ./deploy/ec2-setup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/zoonosis}"
REPO_URL="${REPO_URL:-}"

echo "==> Actualizando el sistema"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Instalando utilidades"
sudo apt-get install -y ca-certificates curl gnupg git ufw

echo "==> Instalando Docker Engine y el plugin compose"
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
fi

echo "==> Dando permiso de Docker al usuario actual"
sudo usermod -aG docker "$USER"

echo "==> Habilitando Docker al arranque"
sudo systemctl enable --now docker

echo "==> Configurando el cortafuegos (SSH, HTTP, HTTPS)"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "==> Creando archivo de intercambio de 2 GB (ayuda en instancias t3.micro)"
if [[ ! -f /swapfile ]]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

if [[ -n "$REPO_URL" && ! -d "$APP_DIR/.git" ]]; then
  echo "==> Clonando el repositorio en $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cat <<'FIN'

===========================================================================
Instancia preparada. Pasos siguientes:

  1. Cierra la sesión SSH y vuelve a entrar (para que aplique el grupo docker).

  2. Entra al directorio del proyecto y crea el archivo de variables:
       cd ~/zoonosis
       cp .env.production.example .env
       nano .env

     Genera los secretos JWT con:
       openssl rand -base64 48

  3. Comprueba que el dominio ya apunta a la IP pública de esta instancia:
       dig +short TU-DOMINIO

  4. Emite el certificado TLS y levanta todo:
       ./deploy/init-letsencrypt.sh

  5. Solo la primera vez, crea los usuarios iniciales:
       sed -i 's/^RUN_SEED=.*/RUN_SEED=true/' .env
       docker compose -f docker-compose.prod.yml up -d --force-recreate backend
       sed -i 's/^RUN_SEED=.*/RUN_SEED=false/' .env

     Después entra con admin@zoonosis.test / Zoo12345 y CAMBIA esa contraseña.

  6. Verifica:
       curl https://TU-DOMINIO/api/v1/health
===========================================================================
FIN
