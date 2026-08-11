#!/usr/bin/env bash
# Deploy de produccion (NUC): pull de master + build + restart
set -e

REPO="/opt/musica"
STATE="/tmp/musica_last_deploy"

cd "$REPO"

# Traer los cambios de master
git pull --ff-only origin master

# Si no hubo cambios desde el ultimo deploy, salir
HEAD=$(git rev-parse HEAD)
if [ "$(cat "$STATE" 2>/dev/null || echo '')" = "$HEAD" ]; then
  exit 0
fi

# Recompilar el frontend (dist/ no viaja por git)
cd "$REPO/client"
npm run build

# Reiniciar el server
sudo systemctl restart musica

echo "$HEAD" > "$STATE"
echo "[$(date)] Deploy a $HEAD"
