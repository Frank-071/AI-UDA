#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
DEPLOY_DIR="$PROJECT_DIR/deploy/ec2"
CONFIG_FILE="$DEPLOY_DIR/deploy.config"
APP_ENV_FILE="$DEPLOY_DIR/.env"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[ -f "$CONFIG_FILE" ] || fail "Falta $CONFIG_FILE. Copia deploy.config.example como deploy.config y configura la ruta de tu archivo .pem."
[ -f "$APP_ENV_FILE" ] || fail "Falta $APP_ENV_FILE. Copia .env.example como .env y reemplaza todos los valores REEMPLAZAR."

# deploy.config es un archivo local controlado por el propietario del proyecto.
# shellcheck disable=SC1090
source <(sed 's/\r$//' "$CONFIG_FILE")

: "${EC2_HOST:?Define EC2_HOST en deploy/ec2/deploy.config}"
: "${EC2_KEY_PATH:?Define EC2_KEY_PATH en deploy/ec2/deploy.config}"
EC2_USER=${EC2_USER:-ubuntu}
EC2_PORT=${EC2_PORT:-22}
REMOTE_DIR=${REMOTE_DIR:-/home/$EC2_USER/workdoc}

[ -f "$EC2_KEY_PATH" ] || fail "No se encontro la clave privada: $EC2_KEY_PATH"
command -v ssh >/dev/null 2>&1 || fail "No se encontro ssh. Ejecuta el script desde Git Bash o WSL."
command -v scp >/dev/null 2>&1 || fail "No se encontro scp. Ejecuta el script desde Git Bash o WSL."
command -v tar >/dev/null 2>&1 || fail "No se encontro tar. Ejecuta el script desde Git Bash o WSL."

if grep -q 'REEMPLAZAR' "$APP_ENV_FILE"; then
  fail "Aun existen valores REEMPLAZAR en deploy/ec2/.env. Configuralos antes de desplegar."
fi

chmod 600 "$EC2_KEY_PATH" 2>/dev/null || true

SSH_OPTIONS=(
  -i "$EC2_KEY_PATH"
  -p "$EC2_PORT"
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=15
)
SCP_OPTIONS=(
  -i "$EC2_KEY_PATH"
  -P "$EC2_PORT"
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=15
)
REMOTE="$EC2_USER@$EC2_HOST"
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-$$"
REMOTE_ARCHIVE="/tmp/workdoc-$RELEASE_ID.tar.gz"
REMOTE_ENV="/tmp/workdoc-$RELEASE_ID.env"
ARCHIVE=$(mktemp "${TMPDIR:-/tmp}/workdoc-deploy.XXXXXX.tar.gz")

cleanup() {
  rm -f "$ARCHIVE"
}
trap cleanup EXIT

echo "Conectando con $REMOTE..."
ssh "${SSH_OPTIONS[@]}" "$REMOTE" "true"

echo "Empaquetando WorkDoc..."
tar -czf "$ARCHIVE" \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='deploy/ec2/.env' \
  --exclude='deploy/ec2/deploy.config' \
  -C "$PROJECT_DIR" .

echo "Subiendo la version $RELEASE_ID..."
scp "${SCP_OPTIONS[@]}" "$ARCHIVE" "$REMOTE:$REMOTE_ARCHIVE"
scp "${SCP_OPTIONS[@]}" "$APP_ENV_FILE" "$REMOTE:$REMOTE_ENV"

echo "Instalando o actualizando WorkDoc en EC2..."
ssh "${SSH_OPTIONS[@]}" "$REMOTE" bash -s -- \
  "$REMOTE_DIR" "$RELEASE_ID" "$REMOTE_ARCHIVE" "$REMOTE_ENV" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

remote_dir=$1
release_id=$2
remote_archive=$3
remote_env=$4
release_dir="$remote_dir/releases/$release_id"

cleanup_remote() {
  rm -f "$remote_archive" "$remote_env"
}
trap cleanup_remote EXIT

if ! command -v docker >/dev/null 2>&1 || ! sudo docker compose version >/dev/null 2>&1; then
  echo "Instalando Docker y Docker Compose..."
  sudo apt-get update
  sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2
fi

sudo systemctl enable --now docker
mkdir -p "$release_dir/deploy/ec2"
tar -xzf "$remote_archive" -C "$release_dir"
install -m 600 "$remote_env" "$release_dir/deploy/ec2/.env"
cd "$release_dir"

echo "Validando configuracion..."
sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml config --quiet

echo "Construyendo imagen de produccion..."
sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml build app

echo "Iniciando PostgreSQL y WorkDoc..."
sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml up -d --remove-orphans

container_id=$(sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml ps -q app)
[ -n "$container_id" ] || { echo "No se creo el contenedor de la aplicacion." >&2; exit 1; }

status=starting
for _ in $(seq 1 40); do
  status=$(sudo docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
  [ "$status" = healthy ] && break
  if [ "$status" = unhealthy ] || [ "$status" = exited ] || [ "$status" = dead ]; then
    break
  fi
  sleep 3
done

if [ "$status" != healthy ]; then
  echo "WorkDoc no alcanzo el estado saludable (estado: $status)." >&2
  sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml logs --tail=150 app db >&2
  exit 1
fi

ln -sfn "$release_dir" "$remote_dir/current"
sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml ps
echo "Despliegue remoto completado."
REMOTE_SCRIPT

echo
echo "WorkDoc fue desplegado correctamente."
echo "URL: http://$EC2_HOST:3000"
